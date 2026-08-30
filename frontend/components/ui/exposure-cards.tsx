"use client"

import { money } from "@/lib/api"

export type FinancialExposure = {
  total_value: number
  refundable_value: number
  non_refundable_exposure: number
  becoming_non_refundable_soon: number
  potential_recovery_value: number
}

const fields: Array<{ key: keyof FinancialExposure; label: string }> = [
  { key: "total_value", label: "Total value" },
  { key: "refundable_value", label: "Refundable value" },
  { key: "non_refundable_exposure", label: "Non-refundable exposure" },
  { key: "becoming_non_refundable_soon", label: "Becoming non-refundable soon" },
  { key: "potential_recovery_value", label: "Potential recovery value" },
]

export function ExposureCards({ exposure, currency = "USD" }: { exposure: FinancialExposure | null; currency?: string }): JSX.Element {
  return (
    <section className="card p-4" aria-label="Financial exposure">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]">Financial exposure</h2>
        {exposure && <span className="text-[11px] text-muted-foreground">{currency}</span>}
      </div>
      {!exposure ? (
        <p className="mt-3 rounded-xl border border-dashed bg-[var(--surface-2)] p-5 text-center text-[13px] text-muted-foreground" role="status" aria-live="polite">Loading financial exposure…</p>
      ) : (
        <dl className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
          {fields.map(({ key, label }, index) => (
            <div key={key} className={`rounded-xl border p-3 ${index === 0 ? "bg-[var(--surface-2)]" : "bg-white"}`}>
              <dt className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-xl font-extrabold tabular-nums">{money(exposure[key], currency)}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
