import type { ReactNode } from "react";
import { Notice, PageHeader } from "@/components/ui/Misc";

/** Shared layout for About / Privacy / Terms / Help pages: one readable column. */
export function LegalPage({ title, intro, draft, children }: { title: string; intro: string; draft?: boolean; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title={title} text={intro} />
      {draft && (
        <Notice tone="warn">
          This is a plain-language <strong>draft</strong> written for the product team. Have a lawyer in your country review it before StudoJob accepts real users.
        </Notice>
      )}
      <div className="space-y-5 leading-relaxed text-ink-700 [&_a]:font-semibold [&_a]:text-brand-700 [&_a]:underline [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink-900 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1">{children}</div>
    </div>
  );
}
