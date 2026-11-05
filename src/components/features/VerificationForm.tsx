"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import type { ActionResult } from "@/lib/stage-e/result";

/** Asks an admin to verify the company. Roles are reviewed before they go live until this is approved. */
export function VerificationForm({ save }: { save: (payload: Record<string, string>) => Promise<ActionResult> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      businessEmail: String(f.get("businessEmail") ?? ""),
      registrationNumber: String(f.get("registrationNumber") ?? ""),
      notes: String(f.get("notes") ?? ""),
    };
    const next: Record<string, string> = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.businessEmail.trim())) next.businessEmail = "Enter a valid business email address.";
    setErrors(next);
    setResult(null);
    if (Object.keys(next).length) return;
    start(async () => {
      const r = await save(payload);
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
      <div>
        <h2 className="text-lg font-bold">Request verification</h2>
        <p className="mt-1 text-sm text-ink-600">Use an email address at your company&apos;s domain. Admins check it before your roles go live.</p>
      </div>
      <Input id="businessEmail" name="businessEmail" label="Business email" type="email" placeholder="you@yourcompany.com" error={errors.businessEmail} />
      <Input id="registrationNumber" name="registrationNumber" label="Company registration number (optional)" />
      <Textarea id="notes" name="notes" label="Notes for the reviewer (optional)" hint="Up to 1000 characters." />
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.message}</Notice>}
      <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send verification request"}</Button>
    </form>
  );
}
