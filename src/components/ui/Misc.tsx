import type { LucideIcon } from "lucide-react";
import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn, initials } from "@/lib/utils";

export function Avatar({ name, hue = 262, size = 44, square = true }: { name: string; hue?: number; size?: number; square?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center font-display font-bold text-white", square ? "rounded-xl" : "rounded-full")}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 70% 52%), hsl(${(hue + 40) % 360} 70% 42%))`,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function StatCard({ label, value, icon: Icon, note }: { label: string; value: string | number; icon: LucideIcon; note?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ink-100">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold text-ink-900">{value}</p>
      {note && <p className="mt-1 text-xs text-ink-500">{note}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-300 bg-white/60 px-6 py-14 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "warn" | "error"; children: ReactNode }) {
  const tones = {
    info: "bg-sky-50 text-sky-900 ring-sky-200",
    success: "bg-mint-100 text-mint-700 ring-mint-400/40",
    warn: "bg-amber-50 text-amber-900 ring-amber-200",
    error: "bg-rose-50 text-rose-800 ring-rose-200",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-2.5 rounded-xl p-3.5 text-sm ring-1", tones[tone])}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function SampleDataNotice() {
  return (
    <Notice tone="warn">
      <strong>Preview data.</strong> Every company, job and person shown here is fictional sample content for Phase 1. Real listings arrive with the backend in Phase 2.
    </Notice>
  );
}

export function BarChart({ data, unit = "" }: { data: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-44 items-end gap-3" role="img" aria-label={`Bar chart: ${data.map((d) => `${d.label} ${d.value}${unit}`).join(", ")}`}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs font-semibold text-ink-700">{d.value}{unit}</span>
          <div className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all" style={{ height: `${(d.value / max) * 100}%`, minHeight: 6 }} />
          <span className="text-xs text-ink-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function PageHeader({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {text && <p className="mt-1 max-w-2xl text-ink-500">{text}</p>}
      </div>
      {action}
    </div>
  );
}
