import { cn } from "@/lib/utils";

/** Student / Employer radio cards (shared by registration and first-time Google/GitHub onboarding). Never offers Admin. */
export function AccountTypePicker({ value, onChange, error }: { value: "student" | "employer"; onChange: (v: "student" | "employer") => void; error?: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink-800">I am a…</legend>
      <div className="grid grid-cols-2 gap-3">
        {(["student", "employer"] as const).map((r) => (
          <label
            key={r}
            className={cn(
              "cursor-pointer rounded-xl px-4 py-3 text-center text-sm font-semibold ring-1 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500",
              value === r ? "bg-brand-50 text-brand-700 ring-brand-400" : "bg-white text-ink-600 ring-ink-200 hover:ring-ink-300",
            )}
          >
            <input type="radio" name="accountType" value={r} checked={value === r} onChange={() => onChange(r)} className="sr-only" />
            {r === "student" ? "Student / graduate" : "Employer"}
          </label>
        ))}
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </fieldset>
  );
}
