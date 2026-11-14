"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { createPostAction } from "@/lib/community/actions";
import { KIND_META, POST_KINDS, postInput } from "@/lib/community/schema";

export function PostComposer() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [kind, setKind] = useState<string>("discussion");
  const [body, setBody] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const parsed = postInput.safeParse({ kind: String(f.get("kind")), title: String(f.get("title") ?? ""), body: String(f.get("body") ?? "") });
    setMsg(null);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    start(async () => {
      const r = await createPostAction(parsed.data);
      if (r.ok) { form.reset(); setBody(""); setMsg({ ok: true, text: r.message }); router.refresh(); }
      else setMsg({ ok: false, text: r.message });
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ink-100">
      <h2 className="text-lg font-bold">Share with the community</h2>
      <Select id="kind" name="kind" label="Post type" value={kind} onChange={(e) => setKind(e.target.value)} hint={KIND_META[kind as keyof typeof KIND_META]?.hint}>
        {POST_KINDS.map((k) => <option key={k} value={k}>{KIND_META[k].label}</option>)}
      </Select>
      <Input id="title" name="title" label="Title" maxLength={120} placeholder="e.g. How I prepared for my first SQL interview" error={errors.title} />
      <Textarea id="body" name="body" label="Details" maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} hint={`${body.length}/3000 · Never share passwords, ID numbers or bank details.`} error={errors.body} />
      {msg && <Notice tone={msg.ok ? "success" : "error"}>{msg.text}</Notice>}
      <Button type="submit" disabled={pending} aria-busy={pending}>{pending ? "Publishing…" : "Publish post"}</Button>
    </form>
  );
}
