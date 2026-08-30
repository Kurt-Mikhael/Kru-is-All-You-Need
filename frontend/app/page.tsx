"use client";

import { GlobeDemo } from "@/components/ui/globe-demo";

export default function Landing() {
  return (
    <main className="relative min-h-screen bg-background">
      <GlobeDemo />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-6 sm:px-6 sm:pb-8">
        <section
          aria-label="Enter continuity workspace"
          className="pointer-events-auto w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:p-6"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Trip continuity
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Kru protects paid trips when disruption appears. Review exposure and replan
            affected bookings in one workspace.
          </p>
          <a
            href="/app"
            className="btn btn-primary mt-4 inline-flex w-full justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 sm:w-auto"
          >
            Open continuity workspace
          </a>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            No setup required — opens with sample data.
          </p>
        </section>
      </div>
    </main>
  );
}
