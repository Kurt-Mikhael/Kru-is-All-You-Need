"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plane, Hotel, Bus, MapPinned, AlertTriangle, RefreshCw, CloudSun, Sparkles, Check, Play, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Badge, Card, Skeleton } from "@/components/ui";
import { api, fmtTime, money } from "@/lib/api";

type Trip = { id: number; name: string; origin: string; destination: string; start_date: string; end_date: string; risk_state: string; intervention_score: number };
type Booking = { id: number; booking_type: string; title: string; location: string; start_time: string; end_time: string; cost: number; status: string };
type RiskEvent = { id: number; event_type: string; location: string; severity: number; confidence: number; source: string; status: string };
type Scenario = { id: number; plan_code: string; title: string; description: string; scores: Record<string, number>; overall_score: number; additional_cost: number; residual_risk: string; status: string; rationale: string };
type LogEntry = { id: number; step: string; status: string; summary: string; created_at: string };

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const show = useCallback((m: string, isErr = false) => { setMsg(m); setErr(isErr); setTimeout(() => setMsg(null), 2800); }, []);
  const node = msg ? <div className="fixed right-4 bottom-4 z-[60] rounded-xl px-4 py-2.5 text-[13px] font-semibold shadow-lg" style={{ background: err ? "var(--danger)" : "var(--navy)", color: "#fff" }}>{msg}</div> : null;
  return { show, node };
}

function BookingIcon({ t }: { t: string }) {
  if (t === "flight") return <Plane size={14} />;
  if (t === "hotel") return <Hotel size={14} />;
  if (t === "transport") return <Bus size={14} />;
  return <MapPinned size={14} />;
}

function AppContent() {
  const search = useSearchParams();
  const { show, node } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<(Trip & { bookings: Booking[] }) | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", origin: "CGK", destination: "NRT", start_date: "", end_date: "" });

  const loadTrips = useCallback(async () => {
    const d = (await api("/trips")) as Trip[];
    setTrips(d);
    if (!selected && d.length) {
      const q = search.get("trip");
      const pick = q ? Number(q) : d[0].id;
      setSelected(pick);
    }
  }, [selected, search]);

  const loadEvents = useCallback(async () => {
    const d = (await api("/risk/events")) as RiskEvent[];
    setEvents(d);
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    const t = (await api(`/trips/${id}`)) as Trip & { bookings: Booking[] };
    setDetail(t);
    const sc = (await api(`/continuity/scenarios/${id}`).catch(() => [])) as Scenario[];
    setScenarios(sc);
    const lg = (await api(`/continuity/trips/${id}/activities`).catch(() => [])) as LogEntry[];
    setLogs(lg);
  }, []);

  useEffect(() => { void loadTrips(); void loadEvents(); }, [loadTrips, loadEvents]);
  useEffect(() => { if (selected) void loadDetail(selected); }, [selected, loadDetail]);

  async function demoSeed() {
    setLoading(true);
    try { await api("/demo/seed", { method: "POST" }); show("Demo seed created"); await loadTrips(); await loadEvents(); } catch (e) { show(e instanceof Error ? e.message : "seed failed", true); } finally { setLoading(false); }
  }
  async function demoReset() {
    setLoading(true);
    try { await api("/demo/reset", { method: "POST" }); setDetail(null); setScenarios([]); setLogs([]); setSelected(null); show("Reset OK"); await loadTrips(); await loadEvents(); } catch (e) { show(e instanceof Error ? e.message : "reset failed", true); } finally { setLoading(false); }
  }
  async function inject(s: string) {
    try { await api(`/risk/events/demo?scenario=${s}`, { method: "POST" }); show(`Inject ${s}`); await loadEvents(); } catch (e) { show(e instanceof Error ? e.message : "inject failed", true); }
  }
  async function weatherCheck() {
    try { const r = (await api("/risk/check-weather", { method: "POST" })) as { created: number }; show(`Cuaca: ${r.created} event baru`); await loadEvents(); } catch (e) { show(e instanceof Error ? e.message : "weather check failed", true); }
  }
  async function createTrip() {
    if (!form.name || !form.origin || !form.destination || !form.start_date || !form.end_date) return show("Complete the form", true);
    try { const t = (await api("/trips", { method: "POST", body: JSON.stringify(form) })) as Trip; show(`Trip ${t.id} dibuat`); setShowNew(false); await loadTrips(); setSelected(t.id); } catch (e) { show(e instanceof Error ? e.message : "creation failed", true); }
  }
  async function evaluate() {
    if (!selected || !events[0]) return show("Need an event first — inject Tokyo Storm", true);
    try { await api(`/risk/evaluate/${selected}?risk_event_id=${events[0].id}`, { method: "POST" }); show("Evaluate OK"); await loadTrips(); await loadDetail(selected); } catch (e) { show(e instanceof Error ? e.message : "evaluate failed", true); }
  }
  async function analyze() {
    if (!selected) return;
    setLoading(true);
    try { const sc = (await api(`/continuity/analyze/${selected}`, { method: "POST" })) as Scenario[]; setScenarios(sc); show(`${sc.length} scenario siap`); await loadDetail(selected); } catch (e) { show(e instanceof Error ? e.message : "analyze failed", true); } finally { setLoading(false); }
  }
  async function approve(id: number) {
    try { await api(`/continuity/scenarios/${id}/approve`, { method: "POST" }); show("Approved"); if (selected) await loadDetail(selected); } catch (e) { show(e instanceof Error ? e.message : "approve failed", true); }
  }
  async function executeScenario(id: number) {
    setLoading(true);
    try { const r = (await api(`/continuity/scenarios/${id}/execute`, { method: "POST" })) as { results: unknown[] }; show(`Execute: ${r.results.length} actions`); if (selected) await loadDetail(selected); } catch (e) { show(e instanceof Error ? e.message : "execute failed", true); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-20 border-b bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3">
          <a href="/" className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-[10px] bg-[var(--navy)] text-white"><Plane size={16} /></div>
            <div><div className="text-[15px] font-extrabold leading-none tracking-tight">Kru</div><div className="text-[11px] text-muted-foreground">Continuity</div></div>
          </a>
          <div className="flex flex-wrap gap-2">
            <button onClick={demoSeed} disabled={loading} className="btn btn-ghost btn-sm"><Sparkles size={14} /> Demo Seed</button>
            <button onClick={demoReset} disabled={loading} className="btn btn-ghost btn-sm"><Trash2 size={14} /> Reset</button>
            <button onClick={() => setShowNew(true)} className="btn btn-primary btn-sm"><Plus size={14} /> New Trip</button>
          </div>
        </div>
      </header>

      <div className="dash mx-auto flex max-w-[1280px] items-start gap-4 p-4">
        <aside className="sticky top-[62px] flex w-[360px] shrink-0 flex-col gap-3.5">
          <Card className="p-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]">Trips</h2>
              <button onClick={() => void loadTrips()} className="btn btn-ghost btn-sm !px-2 !py-1"><RefreshCw size={12} /> Refresh</button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {trips.length === 0 && <div className="rounded-xl border border-dashed bg-[var(--surface-2)] p-5 text-center text-[13px] text-muted-foreground">No trips yet. Click <b>Demo Seed</b>.</div>}
              {trips.length === 0 && [1, 2].map(i => <Skeleton key={i} h={62} r={12} />)}
              {trips.map(t => (
                <button key={t.id} onClick={() => setSelected(t.id)} className="flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all" style={{ borderColor: selected === t.id ? "var(--navy)" : "hsl(var(--border))", background: selected === t.id ? "color-mix(in oklch, var(--navy) 6%, white)" : "var(--surface)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-bold">{t.name}</span><Badge state={t.risk_state} />
                  </div>
                  <div className="text-xs text-muted-foreground">{t.origin} → {t.destination} · {t.start_date} → {t.end_date}</div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--navy)]">Score {t.intervention_score.toFixed(1)} <ChevronRight size={12} /><span className="ml-auto h-1 w-16 overflow-hidden rounded-full bg-slate-200"><i className="block h-full rounded-full" style={{ width: `${Math.min(100, t.intervention_score)}%`, background: t.risk_state === "MONITOR" ? "var(--success)" : t.risk_state === "ELEVATED" ? "var(--warning)" : "var(--danger)" }} /></span></div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]">Risk Events</h2>
              <button onClick={() => void loadEvents()} className="btn btn-ghost btn-sm !px-2 !py-1"><RefreshCw size={12} /></button>
            </div>
            <div className="mt-3 flex max-h-[260px] flex-col gap-2 overflow-auto pr-1">
              {events.slice(0, 8).map(e => (
                <div key={e.id} className="flex items-start gap-2.5 rounded-xl border bg-[var(--surface-2)] p-2.5">
                  <div className="grid size-7 shrink-0 place-items-center rounded-lg border bg-white"><AlertTriangle size={14} className="text-[var(--danger)]" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">{e.event_type} <span className="font-normal text-muted-foreground">{e.location}</span> <span className="ml-auto text-[11px] font-normal text-muted-foreground">#{e.id}</span></div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">sev {e.severity} · conf {e.confidence} · {e.source}</div>
                  </div>
                </div>
              ))}
              {events.length === 0 && <div className="py-3 text-center text-xs text-muted-foreground">No events yet — inject below.</div>}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button onClick={() => void inject("TOKYO_SEVERE_WEATHER")} className="btn btn-outline btn-sm">Tokyo Storm</button>
              <button onClick={() => void inject("AIRPORT_STRIKE")} className="btn btn-outline btn-sm">Strike</button>
              <button onClick={() => void inject("AIRLINE_CANCELLATION")} className="btn btn-outline btn-sm">Airline Cancel</button>
              <button onClick={() => void weatherCheck()} className="btn btn-outline btn-sm"><CloudSun size={12} /> Check Weather</button>
            </div>
          </Card>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-3.5">
          {!detail && (
            <Card className="p-10 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-xl border bg-[var(--surface-2)]"><Plane size={20} className="text-[var(--navy)]" /></div>
              <h2 className="mt-3 text-balance text-[18px] font-extrabold tracking-tight text-[var(--navy)]">Select a trip to view details</h2>
              <p className="mx-auto mt-1.5 max-w-[48ch] text-pretty text-[13px] text-muted-foreground">Click a trip on the left. View bookings, dependency graph, risk, and 3 recovery plans.</p>
              <button onClick={() => void demoSeed()} className="btn btn-primary mt-4">Run Demo Seed Now</button>
            </Card>
          )}

          {detail && (
            <>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="text-[18px] font-extrabold tracking-tight text-[var(--navy)]">{detail.name}</h2><div className="mt-0.5 text-[13px] text-muted-foreground">{detail.origin} → {detail.destination} · {detail.start_date} → {detail.end_date}</div></div>
                  <div className="flex flex-wrap items-center gap-2.5"><Badge state={detail.risk_state} /><span className="font-extrabold tabular-nums">{detail.intervention_score.toFixed(1)}</span><div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200"><i className="block h-full rounded-full" style={{ width: `${Math.min(100, detail.intervention_score)}%`, background: detail.risk_state === "MONITOR" ? "var(--success)" : detail.risk_state === "ELEVATED" ? "var(--warning)" : "var(--danger)" }} /></div></div>
                </div>
                <div className="mt-3.5 flex flex-wrap gap-2.5">
                  <button onClick={() => void evaluate()} className="btn btn-outline btn-sm"><AlertTriangle size={14} /> Evaluate (using latest event)</button>
                  <button onClick={() => void analyze()} disabled={loading} className="btn btn-primary btn-sm"><Sparkles size={14} /> Analyze → 3 Plans</button>
                  {loading && <span className="self-center text-xs text-muted-foreground">Processing…</span>}
                </div>
                <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
                  <div className="rounded-xl border bg-[var(--surface-2)] p-3"><div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Total value</div><div className="text-xl font-extrabold">{money(detail.bookings.reduce((a, b) => a + b.cost, 0))}</div></div>
                  <div className="rounded-xl border bg-white p-3"><div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Bookings</div><div className="text-xl font-extrabold">{detail.bookings.length}</div><div className="text-[11px] text-muted-foreground">{detail.bookings.map(b => b.booking_type).join(" · ")}</div></div>
                  <div className="rounded-xl border bg-white p-3"><div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">State</div><div className="mt-1.5"><Badge state={detail.risk_state} /></div><div className="mt-1.5 text-[11px] text-muted-foreground">Threshold PREPARE 65</div></div>
                </div>
                <div className="mt-3.5 overflow-auto rounded-xl border">
                  <table className="w-full border-collapse text-[13px]">
                    <thead><tr className="bg-[var(--surface-2)] text-left"><th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Booking</th><th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Waktu</th><th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Biaya</th><th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Status</th></tr></thead>
                    <tbody>
                      {detail.bookings.map(b => (
                        <tr key={b.id} className="border-t">
                          <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5 font-semibold"><BookingIcon t={b.booking_type} /> {b.title}</span><div className="text-[11px] text-muted-foreground">{b.location} · {b.booking_type}</div></td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{fmtTime(b.start_time)}</td>
                          <td className="px-3 py-2.5 font-bold">{money(b.cost)}</td>
                          <td className="px-3 py-2.5"><span className="rounded-full border bg-white px-2.5 py-1 text-[11px] font-bold">{b.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div>
                <h3 className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]"><Sparkles size={14} /> Recovery Plans</h3>
                {scenarios.length === 0 && <Card className="mt-2 p-4 text-center text-[13px] text-muted-foreground">No plans yet — click <b>Analyze</b> to generate 3 options (A/B/C). Needs event + score ≥65 to auto-trigger.</Card>}
                <div className="mt-2.5 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3">
                  {scenarios.slice().sort((a, b) => b.overall_score - a.overall_score).map(s => (
                    <Card key={s.id} className="flex flex-col overflow-hidden p-0" style={{ borderColor: s.plan_code === "A" ? "var(--navy)" : "hsl(var(--border))" }}>
                      <div className="flex items-center justify-between p-3" style={{ background: s.plan_code === "A" ? "var(--navy)" : "var(--surface-2)", color: s.plan_code === "A" ? "#fff" : "hsl(var(--foreground))" }}>
                        <span className="flex items-center gap-2 font-extrabold">Plan {s.plan_code} · {s.title}</span>
                        <span className="rounded-full border px-2 py-1 text-xs font-extrabold" style={{ background: s.plan_code === "A" ? "rgba(255,255,255,.18)" : "white" }}>{s.overall_score.toFixed(1)}</span>
                      </div>
                      <div className="flex-1 p-3.5">
                        <div className="text-xs text-muted-foreground">{s.description}</div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]"><span className="rounded-full border bg-[var(--surface-2)] px-2 py-1">+{money(s.additional_cost)}</span><span className="rounded-full border bg-[var(--surface-2)] px-2 py-1">{s.residual_risk} risk</span><span className="rounded-full border bg-white px-2 py-1">{s.status}</span></div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                          {Object.entries(s.scores).slice(0, 4).map(([k, v]) => (
                            <div key={k} className="rounded-xl border bg-[var(--surface-2)] p-2"><div className="font-bold uppercase tracking-widest text-muted-foreground">{k}</div><div className="mt-1 font-extrabold">{typeof v === "number" ? v.toFixed(1) : String(v)}</div></div>
                          ))}
                        </div>
                        {s.rationale && <div className="mt-2.5 border-t pt-2 text-xs text-muted-foreground">{s.rationale}</div>}
                      </div>
                      <div className="flex gap-2 border-t p-3">
                        <button onClick={() => void approve(s.id)} disabled={s.status !== "DRAFT"} className="btn btn-outline btn-sm flex-1"><Check size={14} /> Approve</button>
                        <button onClick={() => void executeScenario(s.id)} disabled={s.status !== "APPROVED"} className="btn btn-primary btn-sm flex-1"><Play size={14} /> Execute</button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <Card className="p-3.5">
                <h3 className="text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]">Agent Log</h3>
                <div className="mt-2.5 flex flex-col">
                  {logs.length === 0 && <div className="text-xs text-muted-foreground">No activity yet — analyze to see 7 agent steps.</div>}
                  {logs.map(l => (
                    <div key={l.id} className="flex gap-2.5 border-b border-dashed py-2 text-xs last:border-0">
                      <span className="whitespace-nowrap tabular-nums text-muted-foreground">{l.created_at?.slice(11, 16) || ""}</span>
                      <span className="min-w-[140px] font-bold text-[var(--navy)]">{l.step}</span>
                      <span className="font-bold" style={{ color: l.status === "OK" ? "var(--success)" : "var(--danger)" }}>{l.status}</span>
                      <span className="flex-1 text-muted-foreground">{l.summary}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </section>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[rgba(15,23,42,.45)] p-4 backdrop-blur-sm" onClick={() => setShowNew(false)}>
          <div onClick={e => e.stopPropagation()} className="card w-[440px] max-w-[92vw] p-4">
            <h2 className="text-base font-extrabold text-[var(--navy)]">New Trip</h2>
            <div className="mt-3 flex flex-col gap-2.5">
              <label className="text-xs text-muted-foreground">Nama<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Japan Holiday" className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
              <div className="flex gap-2.5">
                <label className="flex-1 text-xs text-muted-foreground">Origin<input value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} maxLength={3} className="mt-1 w-full rounded-xl border px-3 py-2.5 uppercase" /></label>
                <label className="flex-1 text-xs text-muted-foreground">Destination<input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} maxLength={3} className="mt-1 w-full rounded-xl border px-3 py-2.5 uppercase" /></label>
              </div>
              <div className="flex gap-2.5">
                <label className="flex-1 text-xs text-muted-foreground">Departure<input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
                <label className="flex-1 text-xs text-muted-foreground">Return<input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
              </div>
            </div>
            <div className="mt-3.5 flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="btn btn-ghost btn-sm">Cancel</button>
              <button onClick={() => void createTrip()} className="btn btn-primary btn-sm">Save</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@media(max-width:980px){.dash{flex-direction:column}.dash aside{position:static!important;width:100%!important}}`}</style>
      {node}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton h={120} /></div>}>
      <AppContent />
    </Suspense>
  );
}
