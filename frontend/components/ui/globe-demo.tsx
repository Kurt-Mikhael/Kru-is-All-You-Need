"use client"

import { Globe } from "@/components/ui/globe"

export function GlobeDemo() {
  return (
    <section
      aria-labelledby="kru-globe-title"
      className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background px-4 pb-40 pt-8"
    >
      <h1
        id="kru-globe-title"
        className="pointer-events-none absolute top-14 z-10 max-w-[90vw] text-center text-[clamp(3rem,9vw,8rem)] font-semibold leading-none tracking-[-0.04em] text-slate-900"
      >
        Kru Is All You Need
      </h1>
      <Globe className="top-28" />
      <div className="pointer-events-none absolute inset-0 h-full bg-[radial-gradient(circle_at_50%_200%,rgba(0,0,0,0.2),rgba(255,255,255,0))]" />
    </section>
  )
}
