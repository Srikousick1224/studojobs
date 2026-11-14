"use client";

import { useState } from "react";
import { convertPay, toLpa, type PayUnit } from "@/lib/tools/pay";
import { Select, Input } from "@/components/ui/Field";

const currencies = { INR: "en-IN", USD: "en-US", EUR: "de-DE", GBP: "en-GB" } as const;
type Currency = keyof typeof currencies;

export function PayConverter() {
  const [amount, setAmount] = useState("15000");
  const [unit, setUnit] = useState<PayUnit>("month");
  const [hours, setHours] = useState("40");
  const [currency, setCurrency] = useState<Currency>("INR");

  const result = amount.trim() === "" ? null : convertPay({ amount: Number(amount), unit, hoursPerWeek: Number(hours) });
  const money = (n: number) => new Intl.NumberFormat(currencies[currency], { style: "currency", currency, maximumFractionDigits: n < 100 ? 2 : 0 }).format(n);

  const rows: [string, string][] = result
    ? [
        ["Per hour", money(result.hour)],
        ["Per week", money(result.week)],
        ["Per month", money(result.month)],
        ["Per year", money(result.year)],
        ...(currency === "INR" ? ([["In LPA", `${toLpa(result.year).toFixed(2)} LPA`]] as [string, string][]) : []),
      ]
    : [];

  return (
    <section aria-labelledby="pay-conv" className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
      <h2 id="pay-conv" className="text-xl font-bold">Stipend and salary converter</h2>
      <p className="mt-1 text-sm text-ink-500">Compare offers quoted in different ways. Assumes 52 working weeks a year.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Input id="pay-amount" label="Amount" type="number" inputMode="decimal" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Select id="pay-unit" label="Quoted per" value={unit} onChange={(e) => setUnit(e.target.value as PayUnit)}>
          <option value="hour">Hour</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
        </Select>
        <Select id="pay-cur" label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
          {Object.keys(currencies).map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input id="pay-hours" label="Hours per week" type="number" inputMode="decimal" min={1} max={84} value={hours} onChange={(e) => setHours(e.target.value)} hint="Used for the hourly rate." />
      </div>
      <div className="mt-5" aria-live="polite">
        {result ? (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {rows.map(([k, v], i) => (
              <div key={k} className="stagger rounded-xl bg-brand-50 p-3" style={{ "--i": i } as React.CSSProperties}>
                <dt className="text-xs font-bold uppercase tracking-wider text-brand-700">{k}</dt>
                <dd className="mt-1 font-display text-lg font-extrabold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-ink-500">Enter a valid amount and hours (1 to 84) to see the conversion.</p>
        )}
      </div>
    </section>
  );
}
