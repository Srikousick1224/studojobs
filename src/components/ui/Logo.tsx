import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="var(--color-brand-500)" />
      <path d="M9 20.5 16 11l7 9.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="24" r="2" fill="var(--color-mint-400)" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)} aria-label="StudoJob home">
      <LogoMark />
      <span className={cn("font-display text-xl font-extrabold tracking-tight", light ? "text-white" : "text-ink-900")}>
        Studo<span className="text-brand-500">Job</span>
      </span>
    </Link>
  );
}
