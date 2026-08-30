"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Shield, Plane, Hotel, Activity, Cable, Sparkles, Timer, TrendingDown, Layers } from "lucide-react";
import { Globe } from "@/components/ui/globe";

export default function Landing() {
  const router = useRouter();
  async function demoSeed() {
    try {
      const r = await fetch("/api/demo/seed", { method: "POST" });
      if (!r.ok) throw new Error(await r.text());
      const j = (await r.json()) as { trip_id: number };
      router.push(`/app?trip=${j.trip_id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Demo seed failed — check backend on 8000";
      alert(msg);
    }
  }
  return (
    <main>
      <nav style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "saturate(1.2) blur(10px)", background: "color-mix(in oklch, var(--surface) 85%, transparent)", borderBottom: "1px solid hsl(var(--border))" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--navy)", display: "grid", placeItems: "center", color: "#fff" }}>
              <Plane size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>Kru</div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted))", letterSpacing: ".04em" }}>Trip Continuity</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/app" className="btn btn-ghost btn-sm">Open App</Link>
            <button onClick={demoSeed} className="btn btn-primary btn-sm">Try Demo <ArrowRight size={16} /></button>
          </div>
        </div>
      </nav>

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 20, alignItems: "stretch" }} className="hero">
          <div style={{ background: "var(--navy)", color: "#fff", borderRadius: 20, padding: "36px 32px", display: "flex", flexDirection: "column", gap: 18, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.08, background: "radial-gradient(600px 300px at 20% 0%, #fff, transparent), radial-gradient(800px 400px at 90% 100%, hsl(var(--primary)), transparent)" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", padding: "6px 10px", borderRadius: 9999 }}>
                <span style={{ width: 7, height: 7, borderRadius: 9999, background: "#22c55e", boxShadow: "0 0 0 4px rgba(34,197,94,.25)" }} /> Live monitoring — Open-Meteo + FCDO
              </div>
              <h1 style={{ marginTop: 16, fontSize: "clamp(2rem, 5vw, 3.2rem)", lineHeight: 0.95, letterSpacing: "-0.03em", textWrap: "balance", fontWeight: 800 }}>
                Your trip stays on track,
                <br />
                even when Tokyo storms.
              </h1>
              <p style={{ marginTop: 14, color: "rgba(255,255,255,.78)", fontSize: 16, maxWidth: "42ch", textWrap: "pretty" }}>
                Kru watches 24/7, calculates domino impact and money at risk, then prepares 3 coordinated plans. Approve once — flight rebooks via Atlas, hotel & tour shift together.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
                <button onClick={demoSeed} className="btn" style={{ background: "#fff", color: "var(--navy)", borderColor: "#fff" }}>
                  Run Demo Seed <ArrowRight size={18} />
                </button>
                <Link href="/app" className="btn" style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.22)" }}>
                  View Dashboard
                </Link>
              </div>
              <div style={{ display: "flex", gap: 18, marginTop: 20, fontSize: 12, color: "rgba(255,255,255,.7)" }}>
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Shield size={14} /> 1 approval
                </span>
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Timer size={14} /> PREPARE ≥65
                </span>
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Layers size={14} /> Trip Graph
                </span>
              </div>
            </div>
          </div>

          <div className="relative flex min-h-[480px] flex-col overflow-hidden rounded-[20px] border bg-black">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08),transparent_60%)]" />
            <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6 pb-10 pt-8">
              <span className="pointer-events-none absolute top-6 whitespace-pre-wrap bg-gradient-to-b from-white to-white/20 bg-clip-text text-center text-7xl font-semibold leading-none text-transparent">
                Globe
              </span>
              <Globe className="top-14" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_200%,rgba(0,0,0,0.2),rgba(255,255,255,0))]" />
            </div>
            <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border bg-white p-3.5 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Intervention Score</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[26px] font-extrabold text-[var(--navy)]">75.2</span>
                  <span className="badge badge-PREPARE text-[11px]">PREPARE</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <i className="block h-full w-[75%] rounded-full bg-[var(--danger)]" />
                </div>
                <div className="mt-1.5 text-[11px] text-muted-foreground">Tokyo storm · 36h to departure · Hotel expires in 9h</div>
              </div>
              <div className="rounded-xl border bg-[var(--navy)] p-3.5 text-white shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-widest opacity-70">Value at risk</div>
                <div className="mt-1 text-[22px] font-extrabold">$1,240</div>
                <div className="text-xs opacity-75">CGK → NRT · 4 bookings</div>
                <div className="mt-2 rounded-lg bg-white/10 px-2 py-1.5 text-[11px]">Hotel $600 becomes non-refundable in 24h</div>
              </div>
            </div>
          </div>
        </div>
        <style>{`@media(max-width: 900px){ .hero{grid-template-columns:1fr!important} }`}</style>
      </section>

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 14 }}>
          <div className="card" style={{ padding: 18, display: "flex", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface-2)", border: "1px solid hsl(var(--border))", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Layers size={18} color="var(--navy)" />
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>Trip Graph</div>
              <div style={{ fontSize: 13, color: "hsl(var(--muted))", marginTop: 4, textWrap: "pretty" }}>Flight → Hotel → Tour. Move one, see the domino. Dependents calculated automatically.</div>
            </div>
          </div>
          <div className="card" style={{ padding: 18, display: "flex", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface-2)", border: "1px solid hsl(var(--border))", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <TrendingDown size={18} color="var(--navy)" />
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>6-factor Score</div>
              <div style={{ fontSize: 13, color: "hsl(var(--muted))", marginTop: 4 }}>Severity×confidence 25% + exposure 20% + time-to-departure 15% + deadline 15% + financial 15% + dependency 10% → MONITOR / ELEVATED / PREPARE / ACT.</div>
            </div>
          </div>
          <div className="card" style={{ padding: 18, display: "flex", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface-2)", border: "1px solid hsl(var(--border))", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Sparkles size={18} color="var(--navy)" />
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>3 Coordinated Plans</div>
              <div style={{ fontSize: 13, color: "hsl(var(--muted))", marginTop: 4 }}>LLM writes rationale, deterministic ranking. REBOOK validated against Atlas — no hallucinations.</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 14 }} className="bento">
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "hsl(var(--muted))", fontWeight: 800 }}>Journey A–Z · 2 touches</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 10, alignItems: "center", marginTop: 14 }}>
              {[
                { k: "Input", v: "Trip + 4 bookings + links" },
                { k: "Watch", v: "Weather & geopolitics every 5m" },
                { k: "Approve", v: "1 click saves 96%" },
              ].map((s, i) => (
                <div key={s.k} style={{ background: "var(--surface-2)", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "hsl(var(--muted))", fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>{s.k}</div>
                  <div style={{ fontSize: 12, color: "hsl(var(--muted))", marginTop: 4 }}>{s.v}</div>
                </div>
              )).flatMap((el, i, arr) => (i < arr.length - 1 ? [el, <ArrowRight key={`a-${i}`} size={16} color="hsl(var(--muted))" />] : [el]))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <span className="badge" style={{ background: "var(--surface-2)", border: "1px solid hsl(var(--border))" }}>
                <Plane size={12} /> Atlas sandbox
              </span>
              <span className="badge" style={{ background: "var(--surface-2)", border: "1px solid hsl(var(--border))" }}>
                <Hotel size={12} /> Mock hotel
              </span>
              <span className="badge" style={{ background: "var(--surface-2)", border: "1px solid hsl(var(--border))" }}>
                <Activity size={12} /> Fuji Tour
              </span>
              <span className="badge" style={{ background: "var(--surface-2)", border: "1px solid hsl(var(--border))" }}>
                <Cable size={12} /> Transfer
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ borderRadius: 14, overflow: "hidden", height: 160, position: "relative" }}>
              <img src="https://images.unsplash.com/photo-1492571357708-0bdf4035ca7e?auto=format&fit=crop&w=800&q=80" alt="Shinjuku at night — Tokyo destination" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(16,40,77,.62), transparent 60%)" }} />
              <div style={{ position: "absolute", left: 14, bottom: 14, color: "#fff", fontWeight: 800, textShadow: "0 1px 10px rgba(0,0,0,.4)" }}>CGK → NRT · Demo $1,560</div>
            </div>
            <div style={{ borderRadius: 14, overflow: "hidden", height: 160, position: "relative" }}>
              <img src="https://images.unsplash.com/photo-1490806843957-31b60e1a59fd?auto=format&fit=crop&w=800&q=80" alt="Mount Fuji in morning — tour at risk" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(16,40,77,.62), transparent 60%)" }} />
              <div style={{ position: "absolute", left: 14, bottom: 14, color: "#fff", fontWeight: 800, textShadow: "0 1px 10px rgba(0,0,0,.4)" }}>Mt Fuji Tour — shifts with hotel</div>
            </div>
          </div>
        </div>
        <style>{`@media(max-width: 900px){ .bento{grid-template-columns:1fr!important} }`}</style>
      </section>

      <footer style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 40px", color: "hsl(var(--muted))", fontSize: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span>© Kru — Agentic Trip Continuity · Demo uses Atlas sandbox, hotel/transfer marked as simulated.</span>
        <span style={{ display: "flex", gap: 12 }}>
          <Link href="/app" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
            Dashboard
          </Link>
          <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
            API docs
          </a>
        </span>
      </footer>
    </main>
  );
}
