"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { BACKEND_NOTICE } from "@/lib/backend";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ApplyPanel({ jobTitle, companyName, verified }: { jobTitle: string; companyName: string; verified: boolean }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [valid, setValid] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const email = String(f.get("email") ?? "").trim();
    const note = String(f.get("note") ?? "").trim();
    const next: Record<string, string> = {};
    if (name.length < 2) next.name = "Please enter your full name.";
    if (!emailRe.test(email)) next.email = "Enter a valid email address.";
    if (note.length < 30) next.note = `Tell ${companyName} a little more (at least 30 characters — you have ${note.length}).`;
    setErrors(next);
    setValid(Object.keys(next).length === 0);
  }

  if (!open) {
    return (
      <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
        <Send className="h-5 w-5" aria-hidden="true" /> Apply now
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="animate-rise space-y-4">
      <h2 className="text-lg font-bold">Apply for {jobTitle}</h2>
      {!verified && (
        <Notice tone="warn">This employer is not verified yet. Never pay money to apply for a job.</Notice>
      )}
      <Input id="name" name="name" label="Full name" autoComplete="name" error={errors.name} />
      <Input id="email" name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
      <Textarea id="note" name="note" label="Why are you a good fit?" hint="A few honest sentences are enough." error={errors.note} />
      <Button type="submit" className="w-full">Submit application</Button>
      {valid && <Notice tone="success">{BACKEND_NOTICE}</Notice>}
    </form>
  );
}
