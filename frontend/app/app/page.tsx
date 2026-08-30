"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Bus, Check, ChevronRight, CloudSun, Hotel, MapPinned, Plane, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Badge, Card, ExposureCards, Skeleton, TripGraph } from "@/components/ui";
import { api, fmtTime, money } from "@/lib/api";

type Trip = { id: number; name: string; origin: string; destination: string; start_date: string; end_date: string; risk_state: string; intervention_score: number };
type Booking = { id: number; booking_type: string; provider: string; title: string; location: string; start_time: string; end_time: string; cost: number; currency: string; cancel_deadline: string; change_deadline: string; refundable_pct: number; status: string };
type RiskEvent = { id: number; event_type: string; location: string; severity: number; confidence: number; start_time: string; expected_duration: string; source: string; status: string };
type RiskEvaluation = { trip_id: number; risk_event_id: number; exposure_score: number; risk_state: string; affected_booking_ids: number[]; drivers: Record<string, unknown> };
type Graph = { trip_id: number; nodes: { id: number; title: string; booking_type: string; start_time: string; status: string }[]; edges: { source: number; target: number; relation_type: string }[] };
type Exposure = { total_value: number; refundable_value: number; non_refundable_exposure: number; becoming_non_refundable_soon: number; potential_recovery_value: number };
type ScenarioAction = { booking_id: number; booking_type: string; action: string; new_time?: string; detail?: string };
type Scenario = { id: number; plan_code: string; title: string; description: string; actions: ScenarioAction[]; scores: Record<string, unknown>; overall_score: number; additional_cost: number; value_preserved_pct: number; residual_risk: string; status: string; rationale: string };
type LogEntry = { id: number; step: string; status: string; summary: string; created_at: string };
type ExecutionResult = { booking_id: number; title?: string; action?: string; status?: string; provenance?: string; simulated?: boolean; [key: string]: unknown };
type ExecutionResponse = { scenario_id: number; results: ExecutionResult[]; trip?: Trip & { bookings: Booking[] }; graph?: Graph; financial_exposure?: Exposure; risk?: RiskEvaluation; risk_state?: string; latest_assessment?: RiskEvaluation };

export type BookingFormRow = {
  booking_type: string;
  provider: string;
  title: string;
  location: string;
  start_time: string;
  end_time: string;
  cost: string;
  currency: string;
  cancel_deadline: string;
  change_deadline: string;
  refundable_pct: string;
};

const bookingTypes = ["flight", "hotel", "transport", "activity"];

function defaultBookingRows(): BookingFormRow[] {
  return bookingTypes.map((booking_type) => ({ booking_type, provider: "", title: "", location: "", start_time: "", end_time: "", cost: "", currency: "USD", cancel_deadline: "", change_deadline: "", refundable_pct: "0" }));
}

export function buildBookingPayloads(rows: BookingFormRow[]) {
  return rows.map((row) => ({ ...row, cost: Number(row.cost || 0), refundable_pct: Number(row.refundable_pct || 0) }));
}

export function getSelectedRiskEvent(events: Array<{ id: number }>, selectedId: number | null) {
  return events.find((event) => event.id === selectedId);
}

export function rankScenarios<T extends { overall_score: number; plan_code: string }>(scenarios: T[]) {
  return scenarios.slice().sort((a, b) => b.overall_score - a.overall_score || a.plan_code.localeCompare(b.plan_code));
}

export function executionFailed(results: Array<{ status?: string; error?: unknown }>) {
  return results.some((result) => {
    const status = result.status?.toUpperCase();
    return status === "FAILED" || status === "ERROR" || status === "REJECTED" || Boolean(result.error);
  });
}

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const show = useCallback((next: string, error = false) => { setMessage(next); setIsError(error); window.setTimeout(() => setMessage(null), 3200); }, []);
  const node = message ? <div role="status" className="fixed bottom-4 right-4 z-[60] rounded-xl px-4 py-2.5 text-[13px] font-semibold shadow-lg" style={{ background: isError ? "var(--danger)" : "var(--navy)", color: "#fff" }}>{message}</div> : null;
  return { show, node };
}

function BookingIcon({ type }: { type: string }) {
  if (type === "flight") return <Plane size={14} />;
  if (type === "hotel") return <Hotel size={14} />;
  if (type === "transport") return <Bus size={14} />;
  return <MapPinned size={14} />;
}

function formatValue(value: unknown) {
  if (typeof value === "number") return value.toFixed(1);
  return String(value ?? "-");
}

function AppContent() {
  const search = useSearchParams();
  const { show, node } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [detail, setDetail] = useState<(Trip & { bookings: Booking[] }) | null>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [exposure, setExposure] = useState<Exposure | null>(null);
  const [risk, setRisk] = useState<RiskEvaluation | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [execution, setExecution] = useState<ExecutionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [customOutcome, setCustomOutcome] = useState<string | null>(null);
  const [reactiveDisruption, setReactiveDisruption] = useState(false);
  const [form, setForm] = useState({ name: "", origin: "CGK", destination: "NRT", start_date: "", end_date: "" });
  const [bookingRows, setBookingRows] = useState<BookingFormRow[]>(defaultBookingRows);

  const selectedEvent = getSelectedRiskEvent(events, selectedEventId) as RiskEvent | undefined;
  const ranked = useMemo(() => rankScenarios(scenarios), [scenarios]);
  const recommended = ranked[0];
  const affectedBookingIds = risk?.affected_booking_ids || [];

  const loadTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      setTripsError(null);
      const result = (await api("/trips")) as Trip[];
      setTrips(result);
      setSelectedTripId((current) => {
        if (current && result.some((trip) => trip.id === current)) return current;
        const queryTrip = Number(search.get("trip"));
        return result.find((trip) => trip.id === queryTrip)?.id || result[0]?.id || null;
      });
    } catch (error) {
      setTripsError(error instanceof Error ? error.message : "Unable to load trips");
    } finally {
      setTripsLoading(false);
    }
  }, [search]);
  const loadEvents = useCallback(async () => {
    try {
      setEventsError(null);
      setEvents((await api("/risk/events")) as RiskEvent[]);
    } catch (error) {
      setEventsError(error instanceof Error ? error.message : "Unable to load risk events");
    }
  }, []);

  const loadDetail = useCallback(async (tripId: number) => {
    setDetailLoading(true);
    setDetailError(null);
    setRisk(null);
    try {
      const [trip, tripGraph, tripExposure, tripRisk] = await Promise.all([
        api(`/trips/${tripId}`) as Promise<(Trip & { bookings: Booking[] })>,
        api(`/trips/${tripId}/graph`) as Promise<Graph>,
        api(`/trips/${tripId}/exposure`) as Promise<Exposure>,
        api(`/risk/trips/${tripId}/risk`) as Promise<{ latest_assessment?: RiskEvaluation; risk_state: string; intervention_score: number }>,
      ]);
      setDetail(trip);
      setGraph(tripGraph);
      setExposure(tripExposure);
      const latest = tripRisk.latest_assessment;
      if (latest && typeof latest === "object") setRisk({ ...latest, risk_state: latest.risk_state || tripRisk.risk_state });
      const [nextScenarios, nextLogs] = await Promise.all([
        api(`/continuity/scenarios/${tripId}`).catch(() => []) as Promise<Scenario[]>,
        api(`/continuity/trips/${tripId}/activities`).catch(() => []) as Promise<LogEntry[]>,
      ]);
      setScenarios(nextScenarios);
      setLogs(nextLogs);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Unable to load trip details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshSelected = useCallback(async () => {
    await loadTrips();
    await loadEvents();
    if (selectedTripId) await loadDetail(selectedTripId);
  }, [loadDetail, loadEvents, loadTrips, selectedTripId]);

  useEffect(() => { void loadTrips(); void loadEvents(); }, [loadEvents, loadTrips]);
  useEffect(() => { if (selectedTripId) void loadDetail(selectedTripId); else { setDetail(null); setGraph(null); setExposure(null); setRisk(null); setScenarios([]); setLogs([]); } }, [loadDetail, selectedTripId]);

  async function demoSeed() {
    setLoading(true);
    try {
      const result = (await api("/demo/seed", { method: "POST" })) as { trip_id: number };
      show(`Demo trip ${result.trip_id} created`);
      await loadTrips();
      await loadEvents();
      setSelectedTripId(result.trip_id);
    } catch (error) { show(error instanceof Error ? error.message : "Demo seed failed", true); }
    finally { setLoading(false); }
  }

  async function demoReset() {
    if (typeof window !== "undefined" && !window.confirm("Reset all trips, bookings, risk events, and recovery plans? This cannot be undone.")) return;
    setLoading(true);
    try {
      await api("/demo/reset", { method: "POST" });
      setSelectedTripId(null); setSelectedEventId(null); setDetail(null); setGraph(null); setExposure(null); setRisk(null); setScenarios([]); setLogs([]); setExecution(null);
      show("Demo data reset");
      await loadTrips(); await loadEvents();
    } catch (error) { show(error instanceof Error ? error.message : "Reset failed", true); }
    finally { setLoading(false); }
  }

  async function injectDemo(scenario: string) {
    try { await api(`/risk/events/demo?scenario=${encodeURIComponent(scenario)}`, { method: "POST" }); show(`${scenario} event created`); await loadEvents(); }
    catch (error) { show(error instanceof Error ? error.message : "Event injection failed", true); }
  }

  async function cancelFlight() {
    const flight = detail?.bookings.find((booking) => booking.booking_type === "flight");
    if (!flight) { show("Select a trip with a flight booking first", true); return; }
    try {
      const result = (await api(`/risk/events/operational-disruption?flight_booking_id=${flight.id}`, { method: "POST" })) as { event?: RiskEvent };
      setReactiveDisruption(true);
      if (result.event?.id) setSelectedEventId(result.event.id);
      show("Reactive airline disruption created");
      await refreshSelected();
    } catch (error) { show(error instanceof Error ? error.message : "Airline cancellation failed", true); }
  }

  async function weatherCheck() {
    try { const result = (await api("/risk/check-weather", { method: "POST" })) as unknown[]; show(`${result.length} weather event${result.length === 1 ? "" : "s"} created`); await loadEvents(); }
    catch (error) { show(error instanceof Error ? error.message : "Weather check failed", true); }
  }

  function updateBookingRow(index: number, key: keyof BookingFormRow, value: string) {
    setBookingRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  }

  async function createTrip() {
    if (!form.name.trim() || !form.origin.trim() || !form.destination.trim() || !form.start_date || !form.end_date) { show("Complete the trip details", true); return; }
    const payloads = buildBookingPayloads(bookingRows);
    if (payloads.length !== 4 || payloads.some((booking) => !booking.provider.trim() || !booking.title.trim() || !booking.location.trim() || !booking.start_time || !booking.end_time)) { show("Add all four booking rows with provider, title, location, and times", true); return; }
    setLoading(true);
    try {
      const trip = (await api("/trips", { method: "POST", body: JSON.stringify(form) })) as Trip;
      const created = [] as Booking[];
      for (const booking of payloads) created.push((await api(`/trips/${trip.id}/bookings`, { method: "POST", body: JSON.stringify(booking) })) as Booking);
      const byType = Object.fromEntries(created.map((booking) => [booking.booking_type, booking.id]));
      const dependencies = [[byType.hotel, byType.flight], [byType.transport, byType.flight], [byType.activity, byType.hotel]];
      for (const [dependent_booking_id, depends_on_booking_id] of dependencies) await api(`/trips/${trip.id}/dependencies`, { method: "POST", body: JSON.stringify({ dependent_booking_id, depends_on_booking_id, relation_type: "AFTER" }) });
      setShowNew(false); setForm({ name: "", origin: "CGK", destination: "NRT", start_date: "", end_date: "" }); setBookingRows(defaultBookingRows());
      show(`Trip ${trip.id} created with four bookings`);
      await loadTrips(); setSelectedTripId(trip.id);
    } catch (error) { show(error instanceof Error ? error.message : "Trip creation failed", true); }
    finally { setLoading(false); }
  }

  async function evaluate() {
    if (!selectedTripId) { show("Select a trip first", true); return; }
    if (!selectedEvent) { show("Select a risk event before evaluating", true); return; }
    try {
      const result = (await api(`/risk/evaluate/${selectedTripId}?risk_event_id=${selectedEvent.id}`, { method: "POST" })) as RiskEvaluation;
      setRisk(result); setReactiveDisruption(selectedEvent.source.startsWith("airline") || selectedEvent.event_type === "OPERATIONAL_DISRUPTION");
      show("Risk evaluation complete"); await loadTrips(); await loadDetail(selectedTripId);
    } catch (error) { show(error instanceof Error ? error.message : "Risk evaluation failed", true); }
  }

  async function analyze() {
    if (!selectedTripId) { show("Select a trip first", true); return; }
    setLoading(true);
    try {
      const query = selectedEventId ? `?risk_event_id=${selectedEventId}` : "";
      const result = (await api(`/continuity/analyze/${selectedTripId}${query}`, { method: "POST" })) as Scenario[];
      setScenarios(result); setCustomOutcome(null); show(`${result.length} recovery plans ready`); await loadDetail(selectedTripId);
    } catch (error) { show(error instanceof Error ? error.message : "Recovery analysis failed", true); }
    finally { setLoading(false); }
  }

  async function approveAndExecute() {
    if (!recommended || !selectedTripId) { show("Analyze recovery plans first", true); return; }
    setLoading(true); setExecution(null);
    try {
      await api(`/continuity/scenarios/${recommended.id}/approve`, { method: "POST" });
      const result = (await api(`/continuity/scenarios/${recommended.id}/execute`, { method: "POST" })) as ExecutionResponse;
      setExecution(result);
      if (result.trip) setDetail(result.trip);
      if (result.graph) setGraph(result.graph);
      if (result.financial_exposure) setExposure(result.financial_exposure);
      if (result.risk || result.latest_assessment) setRisk(result.risk || result.latest_assessment || null);
      if (executionFailed(result.results || [])) show("Execution completed with failures", true);
      else show("Recovery plan executed");
      await refreshSelected();
    } catch (error) { show(error instanceof Error ? error.message : "Recovery execution failed", true); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      {tripsLoading && <div role="status" className="border-b bg-[var(--surface-2)] px-4 py-2 text-center text-xs text-muted-foreground">Loading trips…</div>}
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur-md"><div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3"><a href="/" className="flex items-center gap-2.5"><div className="grid size-8 place-items-center rounded-[10px] bg-[var(--navy)] text-white"><Plane size={16} /></div><div><div className="text-[15px] font-extrabold leading-none tracking-tight">Kru</div><div className="text-[11px] text-muted-foreground">Trip Continuity</div></div></a><div className="flex flex-wrap gap-2"><span className="self-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Demo/operator actions</span><button onClick={() => void demoSeed()} disabled={loading} className="btn btn-ghost btn-sm"><Sparkles size={14} /> Demo Seed</button><button onClick={() => void demoReset()} disabled={loading} className="btn btn-ghost btn-sm"><Trash2 size={14} /> Reset</button><button onClick={() => setShowNew(true)} className="btn btn-primary btn-sm"><Plus size={14} /> New Trip</button></div></div></header>
      <div className="dash mx-auto flex max-w-[1280px] items-start gap-4 p-4"><aside className="sticky top-[62px] flex w-[360px] shrink-0 flex-col gap-3.5"><Card className="p-3.5"><div className="flex items-center justify-between"><h2 className="text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]">Trips</h2><button onClick={() => void loadTrips()} className="btn btn-ghost btn-sm !px-2 !py-1"><RefreshCw size={12} /> Refresh</button></div>{tripsError && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">Unable to load trips: {tripsError} <button onClick={() => void loadTrips()} className="ml-1 font-bold underline">Retry</button></div>}<div className="mt-3 flex flex-col gap-2">{trips.length === 0 && !tripsError && <div className="rounded-xl border border-dashed bg-[var(--surface-2)] p-5 text-center text-[13px] text-muted-foreground">No trips yet. Click <b>Demo Seed</b> or create a new trip.</div>}{trips.map((trip) => <button key={trip.id} onClick={() => setSelectedTripId(trip.id)} className="flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all" style={{ borderColor: selectedTripId === trip.id ? "var(--navy)" : "hsl(var(--border))", background: selectedTripId === trip.id ? "color-mix(in oklch, var(--navy) 6%, white)" : "var(--surface)" }}><div className="flex items-center justify-between gap-2"><span className="truncate text-[13px] font-bold">{trip.name}</span><Badge state={trip.risk_state} /></div><div className="text-xs text-muted-foreground">{trip.origin} → {trip.destination} · {trip.start_date} → {trip.end_date}</div><div className="flex items-center gap-1.5 text-xs font-bold text-[var(--navy)]">Score {trip.intervention_score.toFixed(1)} <ChevronRight size={12} /></div></button>)}</div></Card>
        <Card className="p-3.5"><div className="flex items-center justify-between"><h2 className="text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]">Risk Events</h2><button onClick={() => void loadEvents()} className="btn btn-ghost btn-sm !px-2 !py-1"><RefreshCw size={12} /></button></div>{eventsError && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">Unable to load events: {eventsError} <button onClick={() => void loadEvents()} className="ml-1 font-bold underline">Retry</button></div>}<div className="mt-3 flex max-h-[280px] flex-col gap-2 overflow-auto pr-1">{events.map((event) => <button key={event.id} onClick={() => setSelectedEventId(event.id)} aria-pressed={selectedEventId === event.id} className="flex items-start gap-2.5 rounded-xl border p-2.5 text-left" style={{ borderColor: selectedEventId === event.id ? "var(--navy)" : "hsl(var(--border))", background: event.source.startsWith("airline") || event.event_type === "OPERATIONAL_DISRUPTION" ? "#fff7ed" : "var(--surface-2)" }}><div className="grid size-7 shrink-0 place-items-center rounded-lg border bg-white"><AlertTriangle size={14} className={event.source.startsWith("airline") || event.event_type === "OPERATIONAL_DISRUPTION" ? "text-orange-600" : "text-[var(--danger)]"} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">{event.event_type} <span className="font-normal text-muted-foreground">{event.location || "Operational"}</span><span className="ml-auto text-[11px] font-normal text-muted-foreground">#{event.id}</span></div><div className="mt-0.5 text-[11px] text-muted-foreground">{event.source.startsWith("airline") || event.event_type === "OPERATIONAL_DISRUPTION" ? "Reactive airline signal" : "Predictive risk signal"} · sev {event.severity} · conf {event.confidence}</div></div></button>)}{events.length === 0 && !eventsError && <div className="py-3 text-center text-xs text-muted-foreground">No events yet. Use an operator action below.</div>}</div><div className="mt-2.5 flex flex-wrap gap-1.5"><button onClick={() => void injectDemo("TOKYO_SEVERE_WEATHER")} className="btn btn-outline btn-sm">Tokyo Storm</button><button onClick={() => void injectDemo("AIRPORT_STRIKE")} className="btn btn-outline btn-sm">Strike</button><button onClick={() => void cancelFlight()} className="btn btn-outline btn-sm">Airline Cancel</button><button onClick={() => void weatherCheck()} className="btn btn-outline btn-sm"><CloudSun size={12} /> Check Weather</button></div></Card></aside>
        <section className="flex min-w-0 flex-1 flex-col gap-3.5">{!detail && !detailLoading && <Card className="p-10 text-center"><div className="mx-auto grid size-12 place-items-center rounded-xl border bg-[var(--surface-2)]"><Plane size={20} className="text-[var(--navy)]" /></div><h2 className="mt-3 text-balance text-[18px] font-extrabold tracking-tight text-[var(--navy)]">Select a trip to view details</h2><p className="mx-auto mt-1.5 max-w-[48ch] text-pretty text-[13px] text-muted-foreground">View bookings, dependencies, financial exposure, risk, and recovery plans in one workspace.</p><button onClick={() => void demoSeed()} className="btn btn-primary mt-4">Run Demo Seed Now</button></Card>}{detailLoading && <Card className="space-y-3 p-6"><Skeleton h={28} /><Skeleton h={90} /><Skeleton h={160} /></Card>}{detailError && detail && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Showing stale trip data. Refresh failed: {detailError} <button onClick={() => selectedTripId && void loadDetail(selectedTripId)} className="ml-2 font-bold underline">Retry</button></div>}{detailError && !detail && <Card className="p-8 text-center"><h2 className="font-bold text-[var(--navy)]">Unable to load this trip</h2><p className="mt-2 text-sm text-muted-foreground">{detailError}</p><button onClick={() => selectedTripId && void loadDetail(selectedTripId)} className="btn btn-primary mt-4">Retry</button></Card>}
          {detail && !detailLoading && <><Card className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-[20px] font-extrabold tracking-tight text-[var(--navy)]">{detail.name}</h1><div className="mt-0.5 text-[13px] text-muted-foreground">{detail.origin} → {detail.destination} · {detail.start_date} → {detail.end_date}</div></div><div className="flex flex-wrap items-center gap-2.5"><Badge state={risk?.risk_state || detail.risk_state} /><span className="font-extrabold tabular-nums">{(risk?.exposure_score ?? detail.intervention_score).toFixed(1)}</span></div></div>{reactiveDisruption && <div className="mt-3 rounded-xl border border-orange-300 bg-orange-50 p-3 text-sm text-orange-950"><b>Reactive disruption:</b> airline cancellation received for the selected flight. This operational signal is distinct from predictive weather and strike alerts.</div>}<div className="mt-3.5 flex flex-wrap gap-2.5"><button onClick={() => void evaluate()} className="btn btn-outline btn-sm"><AlertTriangle size={14} /> Evaluate Selected Event</button><button onClick={() => void analyze()} disabled={loading} className="btn btn-primary btn-sm"><Sparkles size={14} /> Analyze Recovery Plans</button>{loading && <span className="self-center text-xs text-muted-foreground">Processing…</span>}</div>{risk && <div className="mt-3.5 rounded-xl border bg-[var(--surface-2)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Selected risk assessment · event #{risk.risk_event_id}</span><Badge state={risk.risk_state} /></div><div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2"><div><div className="text-[11px] text-muted-foreground">Exposure score</div><div className="font-extrabold">{risk.exposure_score.toFixed(1)}</div></div><div><div className="text-[11px] text-muted-foreground">Affected bookings</div><div className="font-extrabold">{risk.affected_booking_ids.length}</div></div>{Object.entries(risk.drivers).map(([key, value]) => <div key={key}><div className="text-[11px] text-muted-foreground">{key}</div><div className="font-extrabold">{formatValue(value)}</div></div>)}</div></div>}<div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5"><div className="rounded-xl border bg-[var(--surface-2)] p-3"><div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Total value</div><div className="text-xl font-extrabold">{money(detail.bookings.reduce((sum, booking) => sum + booking.cost, 0), detail.bookings[0]?.currency)}</div></div><div className="rounded-xl border bg-white p-3"><div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Bookings</div><div className="text-xl font-extrabold">{detail.bookings.length}</div></div><div className="rounded-xl border bg-white p-3"><div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Trip state</div><div className="mt-1.5"><Badge state={risk?.risk_state || detail.risk_state} /></div></div></div><div className="mt-3.5 overflow-auto rounded-xl border"><table className="w-full border-collapse text-[13px]"><thead><tr className="bg-[var(--surface-2)] text-left"><th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Booking</th><th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Dates / times</th><th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cost</th><th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Deadlines / refund</th><th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Status</th></tr></thead><tbody>{detail.bookings.map((booking) => <tr key={booking.id} className="border-t" style={{ background: affectedBookingIds.includes(booking.id) ? "#fff7ed" : undefined }}><td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5 font-semibold"><BookingIcon type={booking.booking_type} /> {booking.title}</span><div className="text-[11px] text-muted-foreground">{booking.provider} · {booking.location} · {booking.booking_type}{affectedBookingIds.includes(booking.id) ? " · Affected" : ""}</div></td><td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{fmtTime(booking.start_time)}<br />{fmtTime(booking.end_time)}</td><td className="px-3 py-2.5 font-bold">{money(booking.cost, booking.currency)}<div className="text-[11px] font-normal text-muted-foreground">{booking.currency}</div></td><td className="px-3 py-2.5 text-[11px]">Cancel {fmtTime(booking.cancel_deadline)}<br />Change {fmtTime(booking.change_deadline)}<br />{booking.refundable_pct}% refundable</td><td className="px-3 py-2.5"><span className="rounded-full border bg-white px-2.5 py-1 text-[11px] font-bold">{booking.status}</span></td></tr>)}</tbody></table></div></Card><div className="grid gap-3 lg:grid-cols-2"><Card className="p-3.5"><h2 className="text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]">Trip Graph</h2><div className="mt-2.5"><TripGraph graph={graph} affectedBookingIds={affectedBookingIds} /></div></Card><Card className="p-3.5"><h2 className="text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]">Financial Exposure</h2><div className="mt-2.5"><ExposureCards exposure={exposure} currency={detail.bookings[0]?.currency} /></div></Card></div><div><h2 className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]"><Sparkles size={14} /> Recovery Plans</h2>{scenarios.length === 0 && <Card className="mt-2 p-4 text-center text-[13px] text-muted-foreground">No plans yet. Select an event, evaluate risk, then analyze recovery plans.</Card>}<div className="mt-2.5 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">{ranked.map((scenario) => <Card key={scenario.id} className="flex flex-col overflow-hidden p-0" style={{ borderColor: scenario.id === recommended?.id ? "var(--navy)" : "hsl(var(--border))" }}><div className="flex items-center justify-between p-3" style={{ background: scenario.id === recommended?.id ? "var(--navy)" : "var(--surface-2)", color: scenario.id === recommended?.id ? "#fff" : "hsl(var(--foreground))" }}><span className="font-extrabold">Plan {scenario.plan_code} · {scenario.title}</span><span className="rounded-full border px-2 py-1 text-xs font-extrabold">{scenario.overall_score.toFixed(1)}</span></div><div className="flex-1 p-3.5"><div className="text-xs text-muted-foreground">{scenario.description}</div><div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]"><span className="rounded-full border bg-[var(--surface-2)] px-2 py-1">Cost +{money(scenario.additional_cost)}</span><span className="rounded-full border bg-[var(--surface-2)] px-2 py-1">Value preserved {scenario.value_preserved_pct}%</span><span className="rounded-full border bg-white px-2 py-1">Residual risk {scenario.residual_risk}</span><span className="rounded-full border bg-white px-2 py-1">{scenario.status}</span></div><h3 className="mt-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Actions</h3><ul className="mt-1 space-y-1 text-xs">{scenario.actions.map((action, index) => <li key={`${action.booking_id}-${index}`} className="flex gap-2"><span className="font-bold">{action.action}</span><span>booking #{action.booking_id} {action.detail || ""}{action.new_time ? ` · ${fmtTime(action.new_time)}` : ""}</span></li>)}</ul><h3 className="mt-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Scores</h3><div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">{Object.entries(scenario.scores).map(([key, value]) => <div key={key} className="rounded-xl border bg-[var(--surface-2)] p-2"><div className="font-bold uppercase tracking-widest text-muted-foreground">{key}</div><div className="mt-1 font-extrabold">{formatValue(value)}</div></div>)}</div>{scenario.rationale && <div className="mt-2.5 border-t pt-2 text-xs text-muted-foreground"><b>Why:</b> {scenario.rationale}</div>}</div></Card>)}</div>{recommended && <Card className="mt-3 border-[var(--navy)] bg-[var(--surface-2)] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recommended · highest overall score</div><div className="mt-1 font-extrabold text-[var(--navy)]">Plan {recommended.plan_code} · {recommended.title} · {recommended.overall_score.toFixed(1)}</div><div className="mt-1 text-xs text-muted-foreground">{recommended.rationale || "Best balance of cost, preserved value, and residual risk."}</div></div><div className="flex flex-wrap gap-2"><button onClick={() => void approveAndExecute()} disabled={loading || recommended.status === "EXECUTED"} className="btn btn-primary"><Check size={14} /> Approve &amp; Execute</button><button onClick={() => { setCustomOutcome("Keeping the current trip. No recovery plan was approved."); show("Current trip kept"); }} disabled={loading} className="btn btn-ghost">Keep Current Trip</button></div></div></Card>}</div>{execution && <Card className="p-3.5"><h2 className="text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]">Execution Outcome</h2><div className={`mt-2 rounded-xl border p-3 text-sm ${executionFailed(execution.results || []) ? "border-red-300 bg-red-50 text-red-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>{executionFailed(execution.results || []) ? "Execution failed for one or more bookings. Review each result below." : "Execution completed successfully."}</div><div className="mt-3 overflow-auto rounded-xl border"><table className="w-full text-left text-xs"><thead className="bg-[var(--surface-2)]"><tr><th className="px-3 py-2">Booking</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Provenance</th></tr></thead><tbody>{(execution.results || []).map((result, index) => <tr key={`${result.booking_id}-${index}`} className="border-t"><td className="px-3 py-2">#{result.booking_id} {result.title || ""}</td><td className="px-3 py-2">{result.action || "-"}</td><td className="px-3 py-2 font-bold">{result.status || (result.simulated ? "MOCK COMPLETED" : "COMPLETED")}</td><td className="px-3 py-2">{result.provenance || (result.simulated ? "Mock" : "Live")}</td></tr>)}</tbody></table></div></Card>}{customOutcome && <div className="rounded-xl border bg-white p-3 text-sm text-muted-foreground">{customOutcome}</div>}<Card className="p-3.5"><h2 className="text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]">Activity Log</h2><div className="mt-2.5 flex flex-col">{logs.length === 0 && <div className="text-xs text-muted-foreground">No activity yet. Analyze to see the continuity agent steps.</div>}{logs.map((log) => <div key={log.id} className="flex flex-wrap gap-2.5 border-b border-dashed py-2 text-xs last:border-0"><span className="whitespace-nowrap tabular-nums text-muted-foreground">{log.created_at?.slice(11, 16) || ""}</span><span className="min-w-[140px] font-bold text-[var(--navy)]">{log.step}</span><span className="font-bold" style={{ color: log.status === "OK" ? "var(--success)" : "var(--danger)" }}>{log.status}</span><span className="flex-1 text-muted-foreground">{log.summary}</span></div>)}</div></Card></>}
        </section>
      </div>

      {showNew && <div className="fixed inset-0 z-40 overflow-auto bg-[rgba(15,23,42,.45)] p-4 backdrop-blur-sm" onClick={() => setShowNew(false)}><div onClick={(event) => event.stopPropagation()} className="card mx-auto my-8 w-[900px] max-w-[96vw] p-4"><div className="flex items-center justify-between"><div><h2 className="text-base font-extrabold text-[var(--navy)]">New Trip</h2><p className="mt-1 text-xs text-muted-foreground">Trip metadata plus four required booking rows.</p></div><button onClick={() => setShowNew(false)} className="btn btn-ghost btn-sm">Close</button></div><div className="mt-3 grid gap-2.5 md:grid-cols-2"><label className="text-xs text-muted-foreground">Trip name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Japan Holiday" className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label><label className="text-xs text-muted-foreground">Origin<input value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value.toUpperCase() })} maxLength={3} className="mt-1 w-full rounded-xl border px-3 py-2.5 uppercase" /></label><label className="text-xs text-muted-foreground">Destination<input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value.toUpperCase() })} maxLength={3} className="mt-1 w-full rounded-xl border px-3 py-2.5 uppercase" /></label><label className="text-xs text-muted-foreground">Departure<input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label><label className="text-xs text-muted-foreground">Return<input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label></div><div className="mt-4 space-y-3"><h3 className="text-xs font-bold uppercase tracking-widest text-[var(--navy)]">Bookings</h3>{bookingRows.map((row, index) => <div key={row.booking_type} className="rounded-xl border bg-[var(--surface-2)] p-3"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest"><BookingIcon type={row.booking_type} /> {row.booking_type}</div><div className="grid gap-2 md:grid-cols-4"><input aria-label={`${row.booking_type} provider`} value={row.provider} onChange={(event) => updateBookingRow(index, "provider", event.target.value)} placeholder="Provider" className="rounded-lg border px-2.5 py-2 text-xs" /><input aria-label={`${row.booking_type} title`} value={row.title} onChange={(event) => updateBookingRow(index, "title", event.target.value)} placeholder="Title" className="rounded-lg border px-2.5 py-2 text-xs" /><input aria-label={`${row.booking_type} location`} value={row.location} onChange={(event) => updateBookingRow(index, "location", event.target.value)} placeholder="Location" className="rounded-lg border px-2.5 py-2 text-xs" /><input aria-label={`${row.booking_type} cost`} type="number" value={row.cost} onChange={(event) => updateBookingRow(index, "cost", event.target.value)} placeholder="Cost" className="rounded-lg border px-2.5 py-2 text-xs" /><input aria-label={`${row.booking_type} start`} type="text" value={row.start_time} onChange={(event) => updateBookingRow(index, "start_time", event.target.value)} placeholder="Start YYYYMMDDTHHMM" className="rounded-lg border px-2.5 py-2 text-xs" /><input aria-label={`${row.booking_type} end`} type="text" value={row.end_time} onChange={(event) => updateBookingRow(index, "end_time", event.target.value)} placeholder="End YYYYMMDDTHHMM" className="rounded-lg border px-2.5 py-2 text-xs" /><input aria-label={`${row.booking_type} currency`} value={row.currency} onChange={(event) => updateBookingRow(index, "currency", event.target.value.toUpperCase())} placeholder="Currency" className="rounded-lg border px-2.5 py-2 text-xs" /><input aria-label={`${row.booking_type} refundable percentage`} type="number" min="0" max="100" value={row.refundable_pct} onChange={(event) => updateBookingRow(index, "refundable_pct", event.target.value)} placeholder="Refund %" className="rounded-lg border px-2.5 py-2 text-xs" /><input aria-label={`${row.booking_type} cancellation deadline`} value={row.cancel_deadline} onChange={(event) => updateBookingRow(index, "cancel_deadline", event.target.value)} placeholder="Cancellation deadline" className="rounded-lg border px-2.5 py-2 text-xs" /><input aria-label={`${row.booking_type} change deadline`} value={row.change_deadline} onChange={(event) => updateBookingRow(index, "change_deadline", event.target.value)} placeholder="Change deadline" className="rounded-lg border px-2.5 py-2 text-xs" /></div></div>)}</div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowNew(false)} className="btn btn-ghost btn-sm">Cancel</button><button onClick={() => void createTrip()} disabled={loading} className="btn btn-primary btn-sm">Create Trip &amp; Bookings</button></div></div></div>}
      <style>{`@media(max-width:980px){.dash{flex-direction:column}.dash aside{position:static!important;width:100%!important}}`}</style>{node}
    </main>
  );
}

export default function Page() { return <Suspense fallback={<main className="p-6"><Skeleton h={120} /></main>}><AppContent /></Suspense>; }
