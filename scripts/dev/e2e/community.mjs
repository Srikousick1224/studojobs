import { BASE, context, launch, tracker, watch } from "./helpers.mjs";
const t = tracker();
const browser = await launch();
try {
  // --- student
  let ctx = await context(browser, "student2@test.local");
  let page = await ctx.newPage(); const errs = watch(page);
  await page.goto(`${BASE}/community`);
  await page.getByRole("button", { name: "Publish post" }).waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {}); // let React hydrate before typing
  t.check("student sees the composer", await page.getByRole("button", { name: "Publish post" }).count() === 1);
  // validation
  await page.getByRole("button", { name: "Publish post" }).click();
  t.check("empty post shows validation errors", (await page.getByText("Title needs at least 5 characters.").count()) > 0);
  // create
  await page.getByLabel("Post type").selectOption("question");
  await page.getByLabel("Title").fill("How do I prepare for a SQL interview?");
  await page.getByLabel("Details").fill("I have an analyst interview next week. Which SQL topics matter most for freshers?");
  await page.getByRole("button", { name: "Publish post" }).click();
  await page.getByText("Your post is live.").waitFor({ timeout: 8000 }).catch(() => {});
  await page.reload();
  await page.getByRole("link", { name: "How do I prepare for a SQL interview?" }).first().waitFor({ timeout: 8000 }).catch(() => {});
  t.check("new post appears in the feed", await page.getByRole("link", { name: "How do I prepare for a SQL interview?" }).count() === 1);
  // open thread, comment
  await page.getByRole("link", { name: "How do I prepare for a SQL interview?" }).click();
  await page.waitForURL(/\/community\/[0-9a-f-]{36}/);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.getByLabel("Write a comment").fill("Practice joins and GROUP BY first.");
  const t0 = Date.now();
  await page.getByRole("button", { name: "Comment" }).click();
  // The screen swaps the temporary comment for the saved one, so the text can vanish for a moment: poll until it settles.
  let shown = 0;
  for (let k = 0; k < 32 && shown !== 1; k++) { shown = await page.getByText("Practice joins and GROUP BY first.").count(); if (shown !== 1) await page.waitForTimeout(250); }
  t.check("comment is shown", shown === 1, `count=${shown} after ${Date.now() - t0}ms; body=${(await page.locator("main").innerText()).replace(/\s+/g, " ").slice(-220)}`);
  t.check("comment author name is the real one", await page.getByText("Bala Kumar").count() >= 1);
  // like
  await page.getByRole("button", { name: "Like this post" }).click();
  await page.waitForTimeout(800);
  t.check("like toggles on", await page.getByRole("button", { name: "Unlike this post" }).count() === 1);
  // save (bookmark)
  await page.getByRole("button", { name: "Save this post" }).click();
  await page.waitForTimeout(800);
  t.check("save toggles on", await page.getByRole("button", { name: "Remove from saved posts" }).count() === 1);
  await page.goto(`${BASE}/community?view=saved`);
  await page.getByRole("link", { name: "How do I prepare for a SQL interview?" }).first().waitFor({ timeout: 8000 }).catch(() => {});
  t.check("saved view lists it", await page.getByRole("link", { name: "How do I prepare for a SQL interview?" }).count() === 1);
  // search + sort
  await page.goto(`${BASE}/community?q=interview`);
  await page.getByRole("link", { name: "How do I prepare for a SQL interview?" }).first().waitFor({ timeout: 8000 }).catch(() => {});
  t.check("search finds it", await page.getByRole("link", { name: "How do I prepare for a SQL interview?" }).count() === 1);
  await page.goto(`${BASE}/community?q=zzzznothing`);
  t.check("search with no match shows empty state", await page.getByText("No matching posts").count() === 1);
  await page.goto(`${BASE}/community?sort=popular`);
  await page.getByRole("link", { name: "How do I prepare for a SQL interview?" }).first().waitFor({ timeout: 8000 }).catch(() => {});
  const popularLinks = await page.getByRole("link", { name: "How do I prepare for a SQL interview?" }).count();
  t.check("popular sort renders", popularLinks >= 1, `links=${popularLinks}`);
  t.check("no console errors (student)", errs.length === 0, errs.join(" | "));
  await ctx.close();

  // --- logged out
  ctx = await context(browser);
  page = await ctx.newPage(); const errs0 = watch(page);
  await page.goto(`${BASE}/community`);
  t.check("visitor sees the feed", await page.locator("article").count() > 0);
  t.check("visitor sees sign-in prompt, no composer", (await page.getByText("Join the conversation").count()) > 0 && (await page.getByRole("button", { name: "Publish post" }).count()) === 0);
  t.check("no console errors (visitor)", errs0.length === 0, errs0.join(" | "));
  await ctx.close();

  // --- another student: report flow + cannot delete others' posts
  ctx = await context(browser, "student@test.local");
  page = await ctx.newPage(); watch(page);
  await page.goto(`${BASE}/community`);
  await page.locator("article", { hasText: "How do I prepare for a SQL interview?" }).first().waitFor({ timeout: 8000 }).catch(() => {});
  const card = page.locator("article", { hasText: "How do I prepare for a SQL interview?" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await card.getByRole("button", { name: "Report" }).click();
  await card.getByLabel("Why are you reporting this?").selectOption("spam");
  await card.getByRole("button", { name: "Send report" }).click();
  await page.getByText("Thanks. A moderator will review this post.").waitFor({ timeout: 8000 }).catch(() => {});
  t.check("report is accepted", await page.getByText("Thanks. A moderator will review this post.").count() === 1);
  await page.waitForTimeout(1200);
  await card.getByRole("button", { name: "Report" }).click().catch(() => {});
  await card.getByLabel("Why are you reporting this?").selectOption("spam").catch(() => {});
  await card.getByRole("button", { name: "Send report" }).click().catch(() => {});
  await page.getByText("You have already reported this post.").waitFor({ timeout: 8000 }).catch(() => {});
  t.check("second report by same person is refused politely", await page.getByText("You have already reported this post.").count() === 1);
  t.check("no Delete button on someone else's post", await card.getByRole("button", { name: "Delete" }).count() === 0);
  await ctx.close();

  // --- author deletes
  ctx = await context(browser, "student2@test.local");
  page = await ctx.newPage(); watch(page);
  page.on("dialog", (d) => d.accept());
  await page.goto(`${BASE}/community`);
  await page.locator("article", { hasText: "How do I prepare for a SQL interview?" }).getByRole("button", { name: "Delete" }).click();
  await page.waitForTimeout(1200);
  await page.reload();
  t.check("author can delete own post", await page.getByRole("link", { name: "How do I prepare for a SQL interview?" }).count() === 0);
  await ctx.close();
} finally { await browser.close(); }
process.exit(t.done() ? 0 : 1);
