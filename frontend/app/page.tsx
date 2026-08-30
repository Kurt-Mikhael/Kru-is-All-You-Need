"use client";

import { GlobeDemo } from "@/components/ui/globe-demo";

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <GlobeDemo />
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4">
        <a
          href="/app"
          aria-label="Open continuity workspace"
          className="pointer-events-auto btn btn-primary shadow-[0_12px_32px_rgba(15,23,42,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2"
        >
          Open continuity workspace
        </a>
      </div>
    </main>
  );
}
