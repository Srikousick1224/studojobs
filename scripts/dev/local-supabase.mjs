/**
 * LOCAL DEV/TEST ONLY — a small stand-in for the two Supabase services StudoJob talks to:
 *   - PostgREST  (/rest/v1/*)  -> translated to SQL and run against a REAL Postgres as role anon/authenticated,
 *                                 so Row Level Security and the guard triggers decide every result.
 *   - GoTrue     (/auth/v1/*)  -> only what the app calls: user lookup, password sign-in, refresh, logout.
 *   - Storage    (/storage/v1/*) -> upload, delete and signed links. Access is decided by the REAL storage.objects
 *                                 policies from migration 005 (run as the caller); file bytes are kept in memory.
 *
 * It is NOT Supabase. It implements the subset of PostgREST that StudoJob's code uses (select with embeds,
 * eq/neq/gt/gte/lt/lte/like/ilike/is/in/or/not/fts filters, order, limit/offset, count, single object,
 * insert/update/delete with return=representation, rpc). Results from it are labelled "local stand-in".
 *
 *   DATABASE_URL=postgres://postgres@127.0.0.1:54329/studojob_local node scripts/dev/local-supabase.mjs
 */
import crypto from "node:crypto";
import http from "node:http";
import pg from "pg";

const PORT = Number(process.env.PORT ?? 54331);
export const JWT_SECRET = process.env.JWT_SECRET ?? "local-dev-secret-local-dev-secret-0123456789";
const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/studojob_local";
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 12 });

/* ----------------------------------------------------------------------------------- JWT (HS256) */
const b64u = (b) => Buffer.from(b).toString("base64url");
export function signJwt(payload, secret = JWT_SECRET) {
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
function verifyJwt(token) {
  const [h, p, s] = String(token).split(".");
  if (!h || !p || !s) throw new HttpError(401, "PGRST301", "JWSError (CompactDecodeError Invalid number of parts)");
  const expect = crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest("base64url");
  if (expect.length !== s.length || !crypto.timingSafeEqual(Buffer.from(expect), Buffer.from(s))) throw new HttpError(401, "PGRST301", "JWSError JWSInvalidSignature");
  const claims = JSON.parse(Buffer.from(p, "base64url").toString());
  if (claims.exp && claims.exp < Date.now() / 1000) throw new HttpError(401, "PGRST301", "JWT expired");
  return claims;
}
export function sessionFor(user, ttl = 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const access_token = signJwt({ sub: user.id, role: "authenticated", aud: "authenticated", email: user.email, exp });
  return { access_token, token_type: "bearer", expires_in: ttl, expires_at: exp, refresh_token: `r-${user.id}`, user: userJson(user) };
}
const userJson = (u) => ({
  id: u.id, aud: "authenticated", role: "authenticated", email: u.email,
  email_confirmed_at: u.email_confirmed_at ? new Date(u.email_confirmed_at).toISOString() : null,
  app_metadata: u.raw_app_meta_data ?? { provider: "email" }, user_metadata: u.raw_user_meta_data ?? {},
  created_at: u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString(),
});

class HttpError extends Error {
  constructor(status, code, message, details = null, hint = null) { super(message); this.status = status; this.code = code; this.details = details; this.hint = hint; }
}

/* ------------------------------------------------------------------------------ schema metadata */
let meta = null;
async function loadMeta() {
  const cols = await pool.query(`select c.relname t, a.attname col, format_type(a.atttypid, a.atttypmod) type
    from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','v','p') and a.attnum > 0 and not a.attisdropped`);
  const fks = await pool.query(`select con.conname name, (select relname from pg_class where oid = con.conrelid) from_t,
      (select relname from pg_class where oid = con.confrelid) to_t,
      (select array_agg(attname::text order by k.ord) from unnest(con.conkey) with ordinality k(attnum, ord) join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) from_cols,
      (select array_agg(attname::text order by k.ord) from unnest(con.confkey) with ordinality k(attnum, ord) join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum) to_cols
    from pg_constraint con join pg_namespace n on n.oid = con.connamespace where con.contype = 'f' and n.nspname = 'public'`);
  const procs = await pool.query(`select p.proname name, p.proretset retset, p.proargnames argnames from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`);
  const tables = {};
  for (const r of cols.rows) (tables[r.t] ??= {})[r.col] = r.type;
  meta = { tables, fks: fks.rows, procs: Object.fromEntries(procs.rows.map((p) => [p.name, p])) };
}

/* ------------------------------------------------------------------------------------ utilities */
const q = (ident) => `"${String(ident).replace(/"/g, '""')}"`;
function splitTop(str, sep = ",") {
  const out = []; let depth = 0, inQ = false, cur = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '"') inQ = !inQ;
    if (!inQ) { if (ch === "(") depth++; else if (ch === ")") depth--; }
    if (!inQ && depth === 0 && ch === sep) { out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur !== "") out.push(cur);
  return out;
}
const unquote = (s) => (s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1).replace(/\\"/g, '"') : s);

/* --------------------------------------------------------------------------------- select parser */
function parseSelect(sel) {
  return splitTop(sel).map((raw) => {
    const item = raw.trim();
    if (!item) return null;
    const paren = item.indexOf("(");
    if (paren === -1) {
      const [left, cast] = item.split("::");
      const m = left.match(/^(?:([\w]+):)?([\w*]+)$/);
      if (!m) throw new HttpError(400, "PGRST100", `"failed to parse select parameter (${sel})"`);
      if (m[2] === "count" && !cast) return { kind: "count", alias: m[1] ?? "count" };
      return { kind: "col", alias: m[1] ?? m[2], name: m[2], cast };
    }
    const head = item.slice(0, paren), inner = item.slice(paren + 1, item.lastIndexOf(")"));
    const m = head.match(/^(?:([\w]+):)?([\w]+)((?:![\w]+)*)$/);
    if (!m) throw new HttpError(400, "PGRST100", `"failed to parse select parameter (${sel})"`);
    const hints = m[3].split("!").filter(Boolean);
    const inner_ = hints.includes("inner");
    const hint = hints.find((h) => h !== "inner" && h !== "left");
    return { kind: "embed", alias: m[1] ?? m[2], name: m[2], hint, inner: inner_, children: parseSelect(inner) };
  }).filter(Boolean);
}

/** Find how `child` relates to `parent`. Returns {type:'m2o'|'o2m'|'m2m', ...}. Mirrors PostgREST: ambiguity is an error. */
function resolveRel(parent, child, hint) {
  const direct = [];
  for (const fk of meta.fks) {
    if (fk.from_t === parent && fk.to_t === child) direct.push({ type: "m2o", fk });
    if (fk.from_t === child && fk.to_t === parent) direct.push({ type: "o2m", fk });
  }
  let cands = direct;
  if (hint) cands = direct.filter((c) => c.fk.name === hint || c.fk.from_cols.includes(hint) || c.fk.to_cols.includes(hint));
  if (cands.length === 1) return cands[0];
  if (cands.length > 1) throw new HttpError(300, "PGRST201", `Could not embed because more than one relationship was found for '${parent}' and '${child}'`, null, "Try changing the embed with a !hint");
  // many-to-many through a junction table
  for (const j of Object.keys(meta.tables)) {
    const toP = meta.fks.find((f) => f.from_t === j && f.to_t === parent);
    const toC = meta.fks.find((f) => f.from_t === j && f.to_t === child);
    if (toP && toC && j !== parent && j !== child) return { type: "m2m", j, toP, toC };
  }
  throw new HttpError(400, "PGRST200", `Could not find a relationship between '${parent}' and '${child}' in the schema cache`);
}

let aliasN = 0;
const nextAlias = () => `t${++aliasN}`;

/** Build `select <json columns>` for a table alias. Returns {cols: sqlList, joins: extra where conditions for inner embeds}. */
function buildColumns(table, alias, nodes) {
  const cols = []; const inner = [];
  const tcols = meta.tables[table];
  if (!tcols) throw new HttpError(404, "PGRST205", `Could not find the table 'public.${table}' in the schema cache`);
  const list = nodes.length ? nodes : [{ kind: "col", alias: "*", name: "*" }];
  for (const n of list) {
    if (n.kind === "col") {
      if (n.name === "*") { for (const c of Object.keys(tcols)) cols.push(`${alias}.${q(c)} as ${q(c)}`); continue; }
      if (!(n.name in tcols)) throw new HttpError(400, "42703", `column ${table}.${n.name} does not exist`);
      cols.push(`${alias}.${q(n.name)}${n.cast ? `::${n.cast}` : ""} as ${q(n.alias)}`);
    } else if (n.kind === "count") {
      throw new HttpError(400, "PGRST100", "count() is only supported inside an embed");
    } else {
      const rel = resolveRel(table, n.name, n.hint);
      const ca = nextAlias();
      const build = (where, childTable, childAlias, from) => {
        const childCount = n.children.length === 1 && n.children[0].kind === "count";
        if (childCount) return { sql: `(select json_build_array(json_build_object('count', count(*))) from ${from} where ${where})`, exists: `exists(select 1 from ${from} where ${where})` };
        const sub = buildColumns(childTable, childAlias, n.children);
        const subWhere = [where, ...sub.inner].join(" and ");
        return { sql: null, sub, from, where: subWhere, exists: `exists(select 1 from ${from} where ${subWhere})` };
      };
      let expr, exists;
      if (rel.type === "m2o") {
        const where = rel.fk.from_cols.map((c, i) => `${ca}.${q(rel.fk.to_cols[i])} = ${alias}.${q(c)}`).join(" and ");
        const b = build(where, n.name, ca, `public.${q(n.name)} as ${ca}`);
        expr = b.sql ?? `(select row_to_json(s) from (select ${b.sub.cols} from ${b.from} where ${b.where} limit 1) s)`;
        exists = b.exists;
      } else if (rel.type === "o2m") {
        const where = rel.fk.from_cols.map((c, i) => `${ca}.${q(c)} = ${alias}.${q(rel.fk.to_cols[i])}`).join(" and ");
        const b = build(where, n.name, ca, `public.${q(n.name)} as ${ca}`);
        expr = b.sql ?? `(select coalesce(json_agg(s), '[]'::json) from (select ${b.sub.cols} from ${b.from} where ${b.where}) s)`;
        exists = b.exists;
      } else {
        const ja = nextAlias();
        const where = [...rel.toP.from_cols.map((c, i) => `${ja}.${q(c)} = ${alias}.${q(rel.toP.to_cols[i])}`), ...rel.toC.from_cols.map((c, i) => `${ja}.${q(c)} = ${ca}.${q(rel.toC.to_cols[i])}`)].join(" and ");
        const b = build(where, n.name, ca, `public.${q(rel.j)} as ${ja}, public.${q(n.name)} as ${ca}`);
        expr = b.sql ?? `(select coalesce(json_agg(s), '[]'::json) from (select ${b.sub.cols} from ${b.from} where ${b.where}) s)`;
        exists = b.exists;
      }
      cols.push(`${expr} as ${q(n.alias)}`);
      if (n.inner) inner.push(exists);
    }
  }
  return { cols: cols.join(", "), inner };
}

/* ---------------------------------------------------------------------------------- filter parser */
const OPS = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=" };
function parseList(v) {
  const m = v.match(/^\((.*)\)$/s);
  if (!m) throw new HttpError(400, "PGRST100", `invalid list '${v}'`);
  return splitTop(m[1]).map((x) => unquote(x.trim()));
}
function condition(table, alias, col, opExpr, params, negate = false) {
  const type = meta.tables[table]?.[col];
  if (!type) throw new HttpError(400, "42703", `column ${table}.${col} does not exist`);
  let neg = negate; let rest = opExpr;
  if (rest.startsWith("not.")) { neg = !neg; rest = rest.slice(4); }
  const dot = rest.indexOf(".");
  const opFull = dot === -1 ? rest : rest.slice(0, dot);
  const val = dot === -1 ? "" : rest.slice(dot + 1);
  const c = `${alias}.${q(col)}`;
  const add = (v) => { params.push(v); return `$${params.length}`; };
  let sql;
  if (opFull in OPS) sql = `${c} ${OPS[opFull]} ${add(val)}`;
  else if (opFull === "like" || opFull === "ilike") sql = `${c}::text ${opFull} ${add(val.replace(/\*/g, "%"))}`;
  else if (opFull === "is") sql = `${c} is ${val === "null" ? "null" : val === "true" ? "true" : val === "false" ? "false" : "unknown"}`;
  else if (opFull === "in") sql = `${c} = any(${add(parseList(val))}::${type}[])`;
  else if (opFull === "cs") sql = `${c} @> ${add(val)}::${type}`;
  else if (opFull === "cd") sql = `${c} <@ ${add(val)}::${type}`;
  else if (opFull === "ov") sql = `${c} && ${add(val)}::${type}`;
  else {
    const m = opFull.match(/^(pl|ph|w)?fts(?:\((\w+)\))?$/);
    if (!m) throw new HttpError(400, "PGRST100", `unsupported operator '${opFull}'`);
    const fn = m[1] === "pl" ? "plainto_tsquery" : m[1] === "ph" ? "phraseto_tsquery" : m[1] === "w" ? "websearch_to_tsquery" : "to_tsquery";
    const cfg = m[2] ? `'${m[2].replace(/[^\w]/g, "")}'::regconfig,` : "";
    const left = type === "tsvector" ? c : `to_tsvector(${cfg ? cfg.slice(0, -1) + "," : ""}${c}::text)`;
    sql = `${left} @@ ${fn}(${cfg}${add(val)})`;
  }
  return neg ? `not (${sql})` : sql;
}
function logicTree(table, alias, expr, params, negate = false) {
  const m = expr.match(/^(not\.)?(and|or)\((.*)\)$/s);
  if (!m) throw new HttpError(400, "PGRST100", `failed to parse logic tree (${expr})`);
  const neg = negate !== !!m[1];
  const parts = splitTop(m[3]).map((p) => {
    p = p.trim();
    if (/^(not\.)?(and|or)\(/.test(p)) return logicTree(table, alias, p, params);
    const d = p.indexOf(".");
    return condition(table, alias, p.slice(0, d), p.slice(d + 1), params);
  });
  const sql = `(${parts.join(m[2] === "and" ? " and " : " or ")})`;
  return neg ? `not ${sql}` : sql;
}
const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
function buildWhere(table, alias, searchParams, params) {
  const conds = [];
  for (const [key, value] of searchParams.entries()) {
    if (RESERVED.has(key)) continue;
    if (key === "and" || key === "or") conds.push(logicTree(table, alias, `${key}${value}`, params));
    else if (key === "not.and" || key === "not.or") conds.push(logicTree(table, alias, `${key}${value}`, params));
    else if (!key.includes(".")) conds.push(condition(table, alias, key, value, params));
    else throw new HttpError(400, "PGRST100", `filters on embedded resources are not supported by the local stand-in (${key})`);
  }
  return conds;
}
function buildOrder(table, alias, order) {
  if (!order) return "";
  const parts = order.split(",").map((o) => {
    const [col, ...mods] = o.split(".");
    if (!meta.tables[table]?.[col]) throw new HttpError(400, "42703", `column ${table}.${col} does not exist`);
    return `${alias}.${q(col)} ${mods.includes("desc") ? "desc" : "asc"}${mods.includes("nullsfirst") ? " nulls first" : mods.includes("nullslast") ? " nulls last" : ""}`;
  });
  return ` order by ${parts.join(", ")}`;
}

/* --------------------------------------------------------------------------------- request logic */
async function withRole(claims, fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const role = claims?.role === "authenticated" ? "authenticated" : "anon";
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true), set_config('request.jwt.claim.role', $3, true)", [JSON.stringify(claims ?? {}), claims?.sub ?? "", role]);
    const result = await fn(client, role);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally { client.release(); }
}

function statusForPg(e, role) {
  if (e.code === "42501") return role === "anon" ? 401 : 403;
  if (["23505", "23503", "40001", "40P01"].includes(e.code)) return e.code === "40001" || e.code === "40P01" ? 409 : 409;
  if (e.code === "42P01") return 404;
  return 400;
}

async function handleRest(req, url, body, claims) {
  const parts = url.pathname.replace(/^\/rest\/v1\/?/, "").split("/").filter(Boolean);
  if (parts.length === 0) return { status: 200, json: { swagger: "2.0" } };
  const method = req.method;
  const prefer = String(req.headers.prefer ?? "");
  const accept = String(req.headers.accept ?? "");
  const wantsRep = /return=representation/.test(prefer);
  const wantsCount = /count=(exact|planned|estimated)/.test(prefer);
  const single = /vnd\.pgrst\.object\+json/.test(accept);

  if (parts[0] === "rpc") {
    const fn = parts[1];
    if (!meta.procs[fn]) throw new HttpError(404, "PGRST202", `Could not find the function public.${fn} in the schema cache`);
    const args = method === "GET" ? Object.fromEntries(url.searchParams.entries()) : body ?? {};
    return withRole(claims, async (c) => {
      const keys = Object.keys(args); const vals = keys.map((k) => (typeof args[k] === "object" && args[k] !== null ? JSON.stringify(args[k]) : args[k]));
      const call = `public.${q(fn)}(${keys.map((k, i) => `${q(k)} => $${i + 1}`).join(", ")})`;
      const sql = meta.procs[fn].retset ? `select coalesce(json_agg(f), '[]'::json) as r from ${call} f` : `select to_json(${call}) as r`;
      const r = await c.query(sql, vals);
      return { status: 200, json: r.rows[0].r };
    });
  }

  const table = parts[0];
  if (!meta.tables[table]) throw new HttpError(404, "PGRST205", `Could not find the table 'public.${table}' in the schema cache`, null, "Perhaps you meant a different table");
  const params = [];
  const alias = "t0";
  const selectStr = url.searchParams.get("select") ?? "*";

  return withRole(claims, async (c) => {
    const selectJson = (fromSql, extraWhere, order, limit, offset) => {
      aliasN = 0;
      const nodes = parseSelect(selectStr);
      const { cols, inner } = buildColumns(table, alias, nodes);
      const where = [...extraWhere, ...inner];
      return `select to_json(x) as r from (select ${cols} from ${fromSql} as ${alias}${where.length ? ` where ${where.join(" and ")}` : ""}${order}${limit != null ? ` limit ${Number(limit)}` : ""}${offset ? ` offset ${Number(offset)}` : ""}) x`;
    };
    const finish = (rows, total, offset) => {
      const headers = {};
      if (total != null) headers["Content-Range"] = rows.length ? `${offset}-${offset + rows.length - 1}/${total}` : `*/${total}`;
      if (single) {
        if (rows.length !== 1) throw new HttpError(406, "PGRST116", "JSON object requested, multiple (or no) rows returned", `The result contains ${rows.length} rows`);
        return { status: 200, json: rows[0], headers };
      }
      return { status: 200, json: rows, headers };
    };

    if (method === "GET" || method === "HEAD") {
      const where = buildWhere(table, alias, url.searchParams, params);
      const order = buildOrder(table, alias, url.searchParams.get("order"));
      const limit = url.searchParams.get("limit"), offset = Number(url.searchParams.get("offset") ?? 0);
      let total = null;
      if (wantsCount) total = Number((await c.query(`select count(*)::int as n from public.${q(table)} as ${alias}${where.length ? ` where ${where.join(" and ")}` : ""}`, params)).rows[0].n);
      if (method === "HEAD") return { status: 200, json: null, headers: { "Content-Range": `*/${total ?? 0}` } };
      const rows = (await c.query(selectJson(`public.${q(table)}`, where, order, limit, offset), params)).rows.map((r) => r.r);
      return finish(rows, total, offset);
    }

    if (method === "POST") {
      const rowsIn = Array.isArray(body) ? body : [body];
      const keys = [...new Set(rowsIn.flatMap((r) => Object.keys(r)))];
      for (const k of keys) if (!meta.tables[table][k]) throw new HttpError(400, "PGRST204", `Could not find the '${k}' column of '${table}' in the schema cache`);
      // Upsert like PostgREST: ?on_conflict=a,b with Prefer: resolution=merge-duplicates | ignore-duplicates
      const prefer = String(req.headers.prefer ?? "");
      const conflictCols = (url.searchParams.get("on_conflict") ?? "").split(",").map((x) => x.trim()).filter((x) => meta.tables[table][x]);
      let onConflict = "";
      if (conflictCols.length && /resolution=merge-duplicates/.test(prefer)) {
        const set = keys.filter((k) => !conflictCols.includes(k));
        onConflict = ` on conflict (${conflictCols.map(q).join(", ")}) ` + (set.length ? `do update set ${set.map((k) => `${q(k)} = excluded.${q(k)}`).join(", ")}` : "do nothing");
      } else if (conflictCols.length && /resolution=ignore-duplicates/.test(prefer)) {
        onConflict = ` on conflict (${conflictCols.map(q).join(", ")}) do nothing`;
      }
      const ins = keys.length
        ? `insert into public.${q(table)} (${keys.map(q).join(", ")}) select ${keys.map(q).join(", ")} from json_populate_recordset(null::public.${q(table)}, $1::json)${onConflict} returning *`
        : `insert into public.${q(table)} default values returning *`;
      if (!wantsRep) { await c.query(keys.length ? ins : ins, keys.length ? [JSON.stringify(rowsIn)] : []); return { status: 201, json: null }; }
      const sql = `with ins as (${ins}) ${selectJson("ins", [], "", null, 0)}`;
      const rows = (await c.query(sql, keys.length ? [JSON.stringify(rowsIn)] : [])).rows.map((r) => r.r);
      const out = finish(rows, null, 0);
      return { ...out, status: 201 };
    }

    if (method === "PATCH") {
      const keys = Object.keys(body ?? {});
      if (!keys.length) throw new HttpError(400, "PGRST102", "Empty or invalid json");
      for (const k of keys) if (!meta.tables[table][k]) throw new HttpError(400, "PGRST204", `Could not find the '${k}' column of '${table}' in the schema cache`);
      params.push(JSON.stringify(body));
      const bodyParam = `$${params.length}`;
      const where = buildWhere(table, alias, url.searchParams, params);
      const upd = `update public.${q(table)} as ${alias} set ${keys.map((k) => `${q(k)} = r.${q(k)}`).join(", ")} from json_populate_record(null::public.${q(table)}, ${bodyParam}::json) r${where.length ? ` where ${where.join(" and ")}` : ""} returning ${alias}.*`;
      if (!wantsRep) { await c.query(upd, params); return { status: 204, json: null }; }
      const rows = (await c.query(`with upd as (${upd}) ${selectJson("upd", [], "", null, 0)}`, params)).rows.map((r) => r.r);
      return finish(rows, null, 0);
    }

    if (method === "DELETE") {
      const where = buildWhere(table, alias, url.searchParams, params);
      const del = `delete from public.${q(table)} as ${alias}${where.length ? ` where ${where.join(" and ")}` : ""} returning ${alias}.*`;
      if (!wantsRep) { await c.query(del, params); return { status: 204, json: null }; }
      const rows = (await c.query(`with del as (${del}) ${selectJson("del", [], "", null, 0)}`, params)).rows.map((r) => r.r);
      return finish(rows, null, 0);
    }
    throw new HttpError(405, "PGRST117", `Unsupported HTTP method: ${method}`);
  }).catch((e) => { throw e instanceof HttpError ? e : Object.assign(e, { _role: claims?.role }); });
}

/* ------------------------------------------------------------------------------------ auth mock */
const readBody = (req) => new Promise((resolve) => { let s = ""; req.on("data", (d) => (s += d)); req.on("end", () => { try { resolve(s ? JSON.parse(s) : null); } catch { resolve(null); } }); });
const bearer = (req) => { const h = String(req.headers.authorization ?? ""); return h.startsWith("Bearer ") ? h.slice(7) : null; };

async function handleAuth(req, url, body) {
  const route = url.pathname.replace(/^\/auth\/v1\//, "");
  if (route === ".well-known/jwks.json") return { status: 200, json: { keys: [] } };
  if (route === "user" && req.method === "GET") {
    const token = bearer(req);
    let claims;
    try { claims = verifyJwt(token); } catch { return { status: 401, json: { code: 401, error_code: "bad_jwt", msg: "invalid JWT: unable to parse or verify signature" } }; }
    if (claims.role !== "authenticated") return { status: 401, json: { code: 401, error_code: "bad_jwt", msg: "missing sub claim" } };
    const r = await pool.query("select * from auth.users where id = $1", [claims.sub]);
    if (!r.rows[0]) return { status: 403, json: { code: 403, error_code: "user_not_found", msg: "User from sub claim in JWT does not exist" } };
    return { status: 200, json: userJson(r.rows[0]) };
  }
  if (route === "token" && req.method === "POST") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const r = await pool.query("select * from auth.users where lower(email) = lower($1)", [body?.email ?? ""]);
      if (!r.rows[0] || body?.password !== (process.env.LOCAL_TEST_PASSWORD ?? "Password123!")) return { status: 400, json: { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" } };
      return { status: 200, json: sessionFor(r.rows[0]) };
    }
    if (grant === "refresh_token") {
      const id = String(body?.refresh_token ?? "").replace(/^r-/, "");
      const r = await pool.query("select * from auth.users where id::text = $1", [id]);
      if (!r.rows[0]) return { status: 400, json: { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token: Refresh Token Not Found" } };
      return { status: 200, json: sessionFor(r.rows[0]) };
    }
  }
  if (route === "logout") return { status: 204, json: null };
  return { status: 404, json: { code: 404, error_code: "not_found", msg: `local stand-in has no ${req.method} /auth/v1/${route}` } };
}

/* ------------------------------------------------------------------------------------ storage */
const files = new Map(); // "bucket/path" -> Buffer (memory only; gone when the stand-in stops)
const readRaw = (req) => new Promise((resolve) => { const parts = []; req.on("data", (d) => parts.push(d)); req.on("end", () => resolve(Buffer.concat(parts))); });
async function handleStorage(req, url, claims) {
  const rest = decodeURIComponent(url.pathname.replace(/^\/storage\/v1\//, ""));
  const raw = req.method === "GET" ? null : await readRaw(req);
  const json = () => { try { return JSON.parse(raw.toString() || "null"); } catch { return null; } };
  const err = (status, message) => ({ status, json: { statusCode: String(status), error: message, message } });
  // signed link download (no auth, like real Storage: the token is the permission)
  if (req.method === "GET" && rest.startsWith("object/sign/")) {
    const key = rest.slice("object/sign/".length);
    const buf = files.get(key);
    if (!buf || !url.searchParams.get("token")) return err(404, "Object not found");
    return { status: 200, raw: buf };
  }
  const m = /^object\/(sign\/)?([^/]+)\/(.+)$/.exec(rest);
  if (req.method === "POST" && m && !m[1]) {
    const [, , bucket, name] = m;
    const { rows: [b] } = await pool.query("select file_size_limit, allowed_mime_types from storage.buckets where id=$1", [bucket]);
    if (!b) return err(404, "Bucket not found");
    const mime = String(req.headers["content-type"] ?? "").split(";")[0];
    if (b.allowed_mime_types && !b.allowed_mime_types.includes(mime)) return err(415, "mime type " + mime + " is not supported");
    if (b.file_size_limit && raw.length > b.file_size_limit) return err(413, "The object exceeded the maximum allowed size");
    try {
      await withRole(claims, (c) => c.query("insert into storage.objects (bucket_id, name) values ($1,$2)", [bucket, name]));
    } catch (e) {
      return err(e.code === "42501" ? 403 : 400, e.code === "42501" ? "new row violates row-level security policy" : e.message);
    }
    files.set(`${bucket}/${name}`, raw);
    return { status: 200, json: { Key: `${bucket}/${name}`, Id: crypto.randomUUID() } };
  }
  if (req.method === "POST" && m && m[1]) {
    const [, , bucket, name] = m;
    const rows = await withRole(claims, (c) => c.query("select 1 from storage.objects where bucket_id=$1 and name=$2", [bucket, name]).then((r) => r.rows));
    if (!rows.length) return err(400, "Object not found");
    return { status: 200, json: { signedURL: `/object/sign/${bucket}/${name}?token=local-${crypto.randomUUID()}` } };
  }
  const d = /^object\/([^/]+)$/.exec(rest);
  if (req.method === "DELETE" && d) {
    const bucket = d[1];
    const prefixes = (json()?.prefixes ?? []).map(String);
    const gone = await withRole(claims, (c) => c.query("delete from storage.objects where bucket_id=$1 and name = any($2) returning name", [bucket, prefixes]).then((r) => r.rows));
    for (const r of gone) files.delete(`${bucket}/${r.name}`);
    return { status: 200, json: gone.map((r) => ({ name: r.name, bucket_id: bucket })) };
  }
  return err(404, `local stand-in has no ${req.method} /storage/v1/${rest}`);
}

/* ---------------------------------------------------------------------------------------- server */
export async function start() {
  await loadMeta();
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const send = ({ status, json, headers = {} }) => {
      if (process.env.STANDIN_LOG) console.log(`${req.method} ${url.pathname}${url.search.slice(0, 160)} -> ${status}${status >= 400 ? " " + JSON.stringify(json).slice(0, 200) : ""}`);
      const payload = json === null || json === undefined ? "" : JSON.stringify(json);
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", ...headers });
      res.end(req.method === "HEAD" ? "" : payload);
    };
    try {
      if (req.method === "OPTIONS") return send({ status: 204, json: null, headers: { "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" } });
      if (url.pathname === "/__health") return send({ status: 200, json: { ok: true } });
      if (url.pathname === "/__reload") { await loadMeta(); return send({ status: 200, json: { ok: true } }); }
      if (url.pathname.startsWith("/storage/v1/")) {
        const t = bearer(req);
        const claims = t && t.includes(".") && !t.startsWith("sb_publishable_") ? verifyJwt(t) : { role: "anon" };
        const r = await handleStorage(req, url, claims);
        if (r.raw) { res.writeHead(r.status, { "Content-Type": "application/octet-stream" }); return res.end(r.raw); }
        return send(r);
      }
      const body = ["POST", "PATCH", "PUT"].includes(req.method) ? await readBody(req) : null;
      if (url.pathname.startsWith("/auth/v1/")) return send(await handleAuth(req, url, body));
      if (url.pathname.startsWith("/rest/v1")) {
        const token = bearer(req);
        let claims = { role: "anon" };
        const isKey = !token || !token.includes(".") || token.startsWith("sb_publishable_");
        if (!isKey) claims = verifyJwt(token);
        return send(await handleRest(req, url, body, claims));
      }
      return send({ status: 404, json: { message: "not found" } });
    } catch (e) {
      if (e instanceof HttpError) return send({ status: e.status, json: { code: e.code, message: e.message, details: e.details, hint: e.hint } });
      const role = e._role === "authenticated" ? "authenticated" : "anon";
      return send({ status: statusForPg(e, role), json: { code: e.code ?? "XX000", message: e.message, details: e.detail ?? null, hint: e.hint ?? null } });
    }
  });
  await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().then(() => console.log(`local Supabase stand-in on http://127.0.0.1:${PORT} -> ${DATABASE_URL}`));
}
