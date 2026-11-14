"use client";

import { Check, ClipboardCopy, ClipboardPaste, Contrast, Monitor, Moon, RotateCcw, Sparkles, Sun } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import {
  ACCENTS, ACCENT_LABEL, ACCENT_SWATCH, BACKGROUNDS, BUTTONS, DEFAULT_APPEARANCE, EFFECTS, FONTS, MOTIONS, PRESETS, RADII, SCALES, THEMES, parseAppearance,
  type Accent, type Background, type ButtonStyle, type Effects, type FontChoice, type Motion, type Radius, type Scale, type Theme,
} from "@/lib/appearance/settings";
import { resetAppearance, updateAppearance, useAppearance } from "@/lib/appearance/store";
import { cn } from "@/lib/utils";

function Section({ id, title, text, children }: { id: string; title: string; text: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="reveal rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
      <h2 id={id} className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-ink-500">{text}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Accessible single-choice group built from real radio inputs. */
function Choice<T extends string | number>({ name, value, options, onChange, className }: {
  name: string; value: T; options: { value: T; label: string; preview?: ReactNode }[]; onChange: (v: T) => void; className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={cn("grid gap-3", className)}>
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <label key={String(o.value)} className={cn("relative flex cursor-pointer flex-col gap-2 rounded-xl p-3 ring-1 transition hover:bg-ink-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500", checked ? "bg-brand-50 ring-2 ring-brand-500" : "ring-ink-200")}>
            <input type="radio" name={name} className="sr-only" checked={checked} onChange={() => onChange(o.value)} />
            {o.preview}
            <span className="flex items-center justify-between text-sm font-semibold">
              {o.label}
              {checked && <Check className="animate-check h-4 w-4 text-brand-600" aria-hidden="true" />}
            </span>
          </label>
        );
      })}
    </div>
  );
}

const themeOptions: { value: Theme; label: string; icon: typeof Sun; bg: string; fg: string }[] = [
  { value: "light", label: "Light", icon: Sun, bg: "#faf8f4", fg: "#16142a" },
  { value: "dark", label: "Dark", icon: Moon, bg: "#0e0c1d", fg: "#f4f3f8" },
  { value: "system", label: "Match my device", icon: Monitor, bg: "linear-gradient(110deg,#faf8f4 50%,#0e0c1d 50%)", fg: "#6d4aff" },
];

export function AppearanceSettings() {
  const a = useAppearance();
  const isDefault = JSON.stringify(a) === JSON.stringify(DEFAULT_APPEARANCE);
  const [backup, setBackup] = useState("");
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Section id="ap-presets" title="Quick looks" text="One tap to change many things at once. You can still fine-tune everything below.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" onClick={() => updateAppearance(p.values)} className="hover-lift flex items-start gap-3 rounded-xl p-3 text-left ring-1 ring-ink-200 hover:bg-ink-50">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                <span><span className="block text-sm font-bold">{p.label}</span><span className="block text-xs text-ink-500">{p.blurb}</span></span>
              </button>
            ))}
          </div>
        </Section>

        <Section id="ap-theme" title="Theme" text="Dark mode is easier on the eyes at night. “Match my device” follows your phone or computer.">
          <Choice<Theme>
            name="Theme" value={a.theme} onChange={(theme) => updateAppearance({ theme })} className="sm:grid-cols-3"
            options={THEMES.map((t) => {
              const o = themeOptions.find((x) => x.value === t)!;
              return {
                value: t, label: o.label,
                preview: (
                  <span className="flex h-14 items-center justify-center rounded-lg ring-1 ring-black/10" style={{ background: o.bg, color: o.fg }} aria-hidden="true">
                    <o.icon className="h-5 w-5" />
                  </span>
                ),
              };
            })}
          />
        </Section>

        <Section id="ap-accent" title="Accent colour" text="Changes buttons, links and highlights across the whole site.">
          <Choice<Accent>
            name="Accent colour" value={a.accent} onChange={(accent) => updateAppearance({ accent })} className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
            options={ACCENTS.map((c) => ({
              value: c, label: ACCENT_LABEL[c],
              preview: <span className="h-8 w-full rounded-lg" style={{ background: c === "custom" ? `oklch(0.6 0.22 ${a.customHue})` : ACCENT_SWATCH[c] }} aria-hidden="true" />,
            }))}
          />
          {a.accent === "custom" && (
            <div className="mt-4 rounded-xl p-3 ring-1 ring-ink-200">
              <label htmlFor="hue" className="flex items-center justify-between text-sm font-semibold">Pick any colour <span className="text-ink-500">{a.customHue}°</span></label>
              <input id="hue" type="range" min={0} max={360} value={a.customHue} onChange={(e) => updateAppearance({ customHue: Number(e.target.value) })} className="mt-2 h-3 w-full cursor-pointer appearance-none rounded-full" style={{ background: "linear-gradient(90deg in oklch longer hue, oklch(0.65 0.2 0), oklch(0.65 0.2 0))" }} aria-valuetext={`Hue ${a.customHue} degrees`} />
            </div>
          )}
        </Section>

        <Section id="ap-buttons" title="Button style" text="Changes how every main button looks.">
          <Choice<ButtonStyle>
            name="Button style" value={a.button} onChange={(button) => updateAppearance({ button })} className="grid-cols-2 sm:grid-cols-4"
            options={BUTTONS.map((b) => ({
              value: b, label: b[0].toUpperCase() + b.slice(1),
              preview: (
                <span aria-hidden="true" className="flex h-10 items-center justify-center rounded-xl text-xs font-bold"
                  style={b === "outline" ? { boxShadow: "inset 0 0 0 2px var(--color-brand-500)", color: "var(--color-brand-700)" }
                    : b === "gradient" ? { background: "linear-gradient(120deg, var(--color-brand-400), var(--color-brand-800))", color: "#fff" }
                    : b === "glow" ? { background: "var(--color-brand-500)", color: "#fff", boxShadow: "0 4px 18px color-mix(in oklab, var(--color-brand-500) 70%, transparent)" }
                    : { background: "var(--color-brand-500)", color: "#fff" }}>Apply now</span>
              ),
            }))}
          />
        </Section>

        <Section id="ap-bg" title="Background" text="A moving or patterned backdrop behind every page.">
          <Choice<Background>
            name="Background" value={a.background} onChange={(background) => updateAppearance({ background })} className="grid-cols-2 sm:grid-cols-4"
            options={BACKGROUNDS.map((b) => ({
              value: b, label: b === "aurora" ? "Aurora" : b === "grid" ? "Grid" : b === "dots" ? "Dots" : "Plain",
              preview: (
                <span aria-hidden="true" className="h-10 w-full rounded-lg ring-1 ring-ink-200"
                  style={{ background: b === "aurora" ? "radial-gradient(circle at 20% 20%, var(--color-brand-300), transparent 60%), radial-gradient(circle at 80% 70%, var(--color-mint-400), transparent 60%)"
                    : b === "grid" ? "linear-gradient(var(--color-brand-200) 1px, transparent 1px) 0 0/10px 10px, linear-gradient(90deg, var(--color-brand-200) 1px, transparent 1px) 0 0/10px 10px"
                    : b === "dots" ? "radial-gradient(var(--color-brand-300) 1.2px, transparent 1.4px) 0 0/8px 8px" : "transparent" }} />
              ),
            }))}
          />
        </Section>

        <Section id="ap-fx" title="Effects" text="How alive the site feels: moving glows, shine on buttons, cards that rise, a progress bar and a light that follows your mouse.">
          <Choice<Effects>
            name="Effects" value={a.effects} onChange={(effects) => updateAppearance({ effects })} className="sm:grid-cols-3"
            options={EFFECTS.map((x) => ({ value: x, label: x === "none" ? "Off" : x === "subtle" ? "Subtle" : "Lively" }))}
          />
          <p className="mt-3 text-xs text-ink-500">If your device asks for reduced motion, or you chose “Reduce” in Animations below, effects stay calm no matter what.</p>
        </Section>

        <Section id="ap-size" title="Interface size" text="Makes text and buttons larger or smaller everywhere.">
          <Choice<Scale>
            name="Interface size" value={a.scale} onChange={(scale) => updateAppearance({ scale })} className="grid-cols-2 sm:grid-cols-4"
            options={SCALES.map((s) => ({
              value: s, label: s === 100 ? "Default" : `${s}%`,
              preview: <span className="font-display font-extrabold leading-none" style={{ fontSize: `${s / 100 * 1.4}rem` }} aria-hidden="true">Aa</span>,
            }))}
          />
        </Section>

        <Section id="ap-corners" title="Corners" text="Square, softly rounded or fully rounded cards and buttons.">
          <Choice<Radius>
            name="Corners" value={a.radius} onChange={(radius) => updateAppearance({ radius })} className="sm:grid-cols-3"
            options={RADII.map((r) => ({
              value: r, label: r === "sharp" ? "Sharp" : r === "soft" ? "Soft" : "Rounded",
              preview: <span className="h-10 w-full bg-brand-200 ring-1 ring-brand-300" style={{ borderRadius: r === "sharp" ? 2 : r === "soft" ? 8 : 18 }} aria-hidden="true" />,
            }))}
          />
        </Section>

        <Section id="ap-font" title="Font" text="Pick the typeface that is easiest for you to read.">
          <Choice<FontChoice>
            name="Font" value={a.font} onChange={(font) => updateAppearance({ font })} className="sm:grid-cols-3"
            options={FONTS.map((f) => ({
              value: f, label: f === "studo" ? "StudoJob" : f === "system" ? "System" : "Serif",
              preview: (
                <span className="text-xl font-bold leading-none" aria-hidden="true"
                  style={{ fontFamily: f === "studo" ? "var(--font-display)" : f === "system" ? "ui-sans-serif, system-ui, sans-serif" : "Georgia, 'Palatino Linotype', serif" }}>
                  Hire me
                </span>
              ),
            }))}
          />
        </Section>

        <Section id="ap-motion" title="Animations" text="“Match my device” respects your system's reduce-motion setting. Choose Reduce to calm everything down, or Full to always animate.">
          <Choice<Motion>
            name="Animations" value={a.motion} onChange={(motion) => updateAppearance({ motion })} className="sm:grid-cols-3"
            options={MOTIONS.map((m) => ({ value: m, label: m === "system" ? "Match my device" : m === "reduce" ? "Reduce" : "Full" }))}
          />
        </Section>

        <Section id="ap-contrast" title="Contrast" text="Stronger text and borders for easier reading.">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 ring-1 ring-ink-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500">
            <span className="flex items-center gap-3 text-sm font-semibold"><Contrast className="h-5 w-5 text-brand-600" aria-hidden="true" /> High contrast</span>
            <input type="checkbox" role="switch" className="peer sr-only" checked={a.contrast} onChange={(e) => updateAppearance({ contrast: e.target.checked })} />
            <span className="relative h-6 w-11 rounded-full bg-ink-300 transition peer-checked:bg-brand-500 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" aria-hidden="true" />
          </label>
        </Section>
        <Section id="ap-backup" title="Backup and share" text="Copy your look as text, or paste someone else's. Only appearance choices are included.">
          <div className="space-y-3">
            <textarea aria-label="Appearance backup text" value={backup} onChange={(e) => setBackup(e.target.value)} placeholder="Your settings appear here after you press Copy. Paste saved settings here, then press Apply." className="min-h-24 w-full rounded-xl bg-white p-3 font-mono text-xs ring-1 ring-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={async () => {
                const text = JSON.stringify(a, null, 2);
                setBackup(text);
                try { await navigator.clipboard.writeText(text); setNote("Copied to your clipboard."); } catch { setNote("Select the text above and copy it."); }
              }}><ClipboardCopy className="h-4 w-4" aria-hidden="true" /> Copy my settings</Button>
              <Button type="button" size="sm" variant="secondary" disabled={!backup.trim()} onClick={() => {
                try { updateAppearance(parseAppearance(backup)); setNote("Settings applied."); } catch { setNote("That text is not valid settings."); }
              }}><ClipboardPaste className="h-4 w-4" aria-hidden="true" /> Apply pasted settings</Button>
            </div>
            {note && <p role="status" className="text-xs font-medium text-ink-600">{note}</p>}
          </div>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Live preview">
        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ink-100">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Live preview</p>
          <div className="rounded-2xl p-4 ring-1 ring-ink-200">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 font-display font-bold text-white">SJ</span>
              <div>
                <p className="font-display font-bold">Data Analyst Intern</p>
                <p className="text-sm text-ink-500">Sample company · Hybrid</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-mint-100 px-3 py-1 text-xs font-semibold text-mint-700">Paid</span>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Internship</span>
            </div>
            <p className="mt-3 text-sm text-ink-600">Small sample text shows how your size and font choices read.</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" type="button">Apply</Button>
              <Button size="sm" variant="secondary" type="button">Save</Button>
            </div>
          </div>
          <Button type="button" variant="secondary" className="w-full" onClick={resetAppearance} disabled={isDefault}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset to defaults
          </Button>
          <p className="text-xs text-ink-500">Saved only in this browser. Nothing is sent to our servers.</p>
        </div>
      </aside>
    </div>
  );
}
