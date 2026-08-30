"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Shield, Plane, Hotel, Activity, Cable, Sparkles, Timer, TrendingDown, Layers } from "lucide-react";
import { Globe } from "@/components/ui/globe";
const TOKYO_HERO = "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=2000&q=80";
const TOKYO_2 = "https://images.unsplash.com/photo-1492571357708-0bdf4035ca7e?auto=format&fit=crop&w=800&q=80";
const FUJI = "https://images.unsplash.com/photo-1490806843957-31b60e1a59fd?auto=format&fit=crop&w=800&q=80";

export default function Landing() {
  const router = useRouter();
  async function demoSeed() {
    try {
      const r = await fetch("/api/demo/seed", { method: "POST" });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json() as { trip_id: number };
      router.push(`/app?trip=${j.trip_id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "seed gagal, cek backend 8000";
      alert(msg);
    }
  }
  return (
    <main>
      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "saturate(1.2) blur(10px)", background: "color-mix(in oklch, var(--surface) 85%, transparent)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--navy)", display: "grid", placeItems: "center", color: "#fff" }}>
              <Plane size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>Kru</div>
              <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: ".04em" }}>Trip Continuity</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/app" className="btn btn-ghost btn-sm">Buka App</Link>
            <button onClick={demoSeed} className="btn btn-primary btn-sm">Coba Demo <ArrowRight size={16} /></button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 20, alignItems: "stretch" }} className="hero">
          <div style={{ background: "var(--navy)", color: "#fff", borderRadius: 20, padding: "36px 32px", display: "flex", flexDirection: "column", gap: 18, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, opacity: .08, background: `radial-gradient(600px 300px at 20% 0%, #fff, transparent), radial-gradient(800px 400px at 90% 100%, var(--primary), transparent)` }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", padding: "6px 10px", borderRadius: 9999 }}>
                <span style={{ width: 7, height: 7, borderRadius: 9999, background: "#22c55e", boxShadow: "0 0 0 4px rgba(34,197,94,.25)" }} /> Live monitoring — Open-Meteo + FCDO
              </div>
              <h1 style={{ marginTop: 16, fontSize: "clamp(2rem, 5vw, 3.2rem)", lineHeight: .95, letterSpacing: "-0.03em", textWrap: "balance", fontWeight: 800 }}>
                Trip tetap jalan,<br />meski Tokyo badai.
              </h1>
              <p style={{ marginTop: 14, color: "rgba(255,255,255,.78)", fontSize: 16, maxWidth: "42ch", textWrap: "pretty" }}>
                Kru jaga 24/7, hitung domino & duit yang terancam, lalu siapkan 3 plan terkoordinasi. Kamu approve 1x — flight rebook via Atlas, hotel & tour ikut geser.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
                <button onClick={demoSeed} className="btn" style={{ background: "#fff", color: "var(--navy)", borderColor: "#fff" }}>Jalanin Demo Seed <ArrowRight size={18} /></button>
                <Link href="/app" className="btn" style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.22)" }}>Lihat Dashboard</Link>
              </div>
              <div style={{ display: "flex", gap: 18, marginTop: 20, fontSize: 12, color: "rgba(255,255,255,.7)" }}>
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Shield size={14} /> 1 approve</span>
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Timer size={14} /> PREPARE ≥65</span>
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Layers size={14} /> Trip Graph</span>
              </div>
            </div>
          </div>
          <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[20px] border bg-white p-6 shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,40,77,0.08),transparent_60%)]" />
            <div className="absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[480px]">
              <Globe
                config={{
                  width: 800,
                  height: 800,
                  devicePixelRatio: 2,
                  phi: 0,
                  theta: 0.3,
                  dark: 0,
                  diffuse: 0.4,
                  mapSamples: 16000,
                  mapBrightness: 1.2,
                  baseColor: [0.96, 0.96, 0.98],
                  markerColor: [0.09, 0.4, 0.65],
                  glowColor: [0.96, 0.96, 0.98],
                  markers: [
                    { location: [-6.2088, 106.8456], size: 0.08 },
                    { location: [35.678, 139.65], size: 0.08 },
                    { location: [1.3521, 103.8198], size: 0.04 },
                    { location: [13.7563, 100.5018], size: 0.04 },
                    { location: [25.2048, 55.2708], size: 0.04 },
                  ],
                }}
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_200%,rgba(0,0,0,0.06),transparent)]" />
            <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border bg-white/95 p-3.5 shadow-sm backdrop-blur">
                <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Intervention Score</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[26px] font-extrabold text-[var(--navy)]">75.2</span>
                  <span className="badge badge-PREPARE text-[11px]">PREPARE</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><i className="block h-full w-[75%] rounded-full bg-[var(--danger)]" /></div>
                <div className="mt-1.5 text-[11px] text-muted-foreground">Badai Tokyo · 36j lagi · Hotel 9j lagi hangus</div>
              </div>
              <div className="rounded-xl border bg-[var(--navy)] p-3.5 text-white shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-widest opacity-70">Value at risk</div>
                <div className="mt-1 text-[22px] font-extrabold">$1,240</div>
                <div className="text-xs opacity-75">CGK → NRT · 4 bookings</div>
                <div className="mt-2 rounded-lg bg-white/10 px-2 py-1.5 text-[11px]">Hotel $600 jadi non-ref dalam 24j</div>
              </div>
            </div>
            <span className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-pre-wrap bg-gradient-to-b from-slate-900 to-slate-500 bg-clip-text text-center text-[10px] font-bold uppercase tracking-[0.18em] text-transparent">Kru · Global Continuity</span>
          </div>
        </div>
        <style>{`@media(max-width: 900px){ .hero{grid-template-columns:1fr!important} }`}</style>
      </section>

      {/* STEPS */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 14 }}>
          <div className="card" style={{ padding: 18, display: "flex", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0 }}><Layers size={18} color="var(--navy)" /></div>
            <div>
              <div style={{ fontWeight: 700 }}>Trip Graph</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, textWrap: "pretty" }}>Flight → Hotel → Tour. Satu geser, domino kelihatan. Hitung dependents otomatis.</div>
            </div>
          </div>
          <div className="card" style={{ padding: 18, display: "flex", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0 }}><TrendingDown size={18} color="var(--navy)" /></div>
            <div>
              <div style={{ fontWeight: 700 }}>6-factor Score</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Severity×confidence 25% + exposure 20% + H-jam 15% + deadline 15% + finansial 15% + domino 10% → MONITOR/ELEVATED/PREPARE/ACT.</div>
            </div>
          </div>
          <div className="card" style={{ padding: 18, display: "flex", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0 }}><Sparkles size={18} color="var(--navy)" /></div>
            <div>
              <div style={{ fontWeight: 700 }}>3 Plan terkoordinasi</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>LLM bikin rationale, rank deterministik. REBOOK validasi Atlas, tidak halu flight.</div>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO PREVIEW */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 14 }} className="bento">
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800 }}>Alur A–Z · 2 sentuhan</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 10, alignItems: "center", marginTop: 14 }}>
              {[
                { k: "Input", v: "Trip + 4 booking + relasi" },
                { k: "Jaga", v: "Cek cuaca & geopolitik 5m" },
                { k: "Approve", v: "1 klik selamatkan 96%" },
              ].map((s, i) => (
                <div key={s.k} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>{s.k}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{s.v}</div>
                </div>
              )).flatMap((el, i, arr) => (i < arr.length - 1 ? [el, <ArrowRight key={`a-${i}`} size={16} color="var(--muted)" />] : [el]))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <span className="badge" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}><Plane size={12} /> Atlas sandbox</span>
              <span className="badge" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}><Hotel size={12} /> Mock hotel</span>
              <span className="badge" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}><Activity size={12} /> Tour Fuji</span>
              <span className="badge" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}><Cable size={12} /> Transfer</span>
            </div>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ borderRadius: 14, overflow: "hidden", height: 160, position: "relative" }}>
              <img src={TOKYO_2} alt="Shinjuku malam — destinasi Tokyo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(16,40,77,.62), transparent 60%)" }} />
              <div style={{ position: "absolute", left: 14, bottom: 14, color: "#fff", fontWeight: 800, textShadow: "0 1px 10px rgba(0,0,0,.4)" }}>CGK → NRT · Rp demo $1,560</div>
            </div>
            <div style={{ borderRadius: 14, overflow: "hidden", height: 160, position: "relative" }}>
              <img src={FUJI} alt="Mt Fuji pagi — tour yang terancam" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(16,40,77,.62), transparent 60%)" }} />
              <div style={{ position: "absolute", left: 14, bottom: 14, color: "#fff", fontWeight: 800, textShadow: "0 1px 10px rgba(0,0,0,.4)" }}>Mt Fuji Tour — geser bareng hotel</div>
            </div>
          </div>
        </div>
        <style>{`@media(max-width: 900px){ .bento{grid-template-columns:1fr!important} }`}</style>
      </section>

      {/* FOOTER */}
      <footer style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 40px", color: "var(--muted)", fontSize: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span>© Kru — Agentic Trip Continuity · Demo Atlas sandbox, hotel/transfer mock ditandai simulated.</span>
        <span style={{ display: "flex", gap: 12 }}>
          <Link href="/app" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>Dashboard</Link>
          <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>API docs</a>
        </span>
      </footer>
    </main>
  );
}