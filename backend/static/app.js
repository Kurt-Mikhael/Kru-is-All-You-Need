const API = "/api";

let trips = [];
let events = [];
let selectedTrip = null;
let scenarios = [];
let logs = [];

const $ = (id) => document.getElementById(id);

function toast(msg, isErr = false) {
  const t = document.createElement("div");
  t.className = "toast" + (isErr ? " err" : "");
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 3500);
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch {}
    if (typeof detail === "object") detail = JSON.stringify(detail);
    throw new Error(detail);
  }
  return res.json();
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtTime = (t) => {
  if (!t || t === "now") return t || "—";
  const m = String(t).match(/(\d{4})(\d{2})(\d{2})[T](\d{2})(\d{2})/);
  return m ? `${m[3]}/${m[2]} ${m[4]}:${m[5]}` : t;
};
const money = (v) => "$" + Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const stateColor = { MONITOR: "#67c23a", ELEVATED: "#e6a23c", PREPARE: "#e8505b", ACT: "#b71c1c" };

/* ───────────── Trips ───────────── */
async function loadTrips() {
  try {
    trips = await api("/trips");
    renderTrips();
  } catch (e) { toast(e.message, true); }
}

function renderTrips() {
  const el = $("tripList");
  if (!trips.length) {
    el.innerHTML = '<p class="muted">Belum ada trip. Klik "Demo Seed".</p>';
    return;
  }
  el.innerHTML = trips.map((t) => `
    <div class="trip-item ${selectedTrip && selectedTrip.id === t.id ? "active" : ""}"
         style="border-left-color:${stateColor[t.risk_state] || "#909399"}"
         onclick="selectTrip(${t.id})">
      <span class="t-score">${t.intervention_score != null ? t.intervention_score.toFixed(1) : "—"}</span>
      <div class="t-name">${esc(t.name)}</div>
      <div class="t-meta">${esc(t.origin)} → ${esc(t.destination)} &nbsp;|&nbsp; ${esc(t.start_date)} — ${esc(t.end_date)}</div>
      <span class="state-badge state-${esc(t.risk_state)}">${esc(t.risk_state)}</span>
    </div>`).join("");
}

async function selectTrip(id) {
  selectedTrip = trips.find((t) => t.id === id) || null;
  renderTrips();
  await Promise.all([loadTripDetail(), loadScenarios(), loadLogs()]);
}

async function loadTripDetail() {
  const el = $("tripDetail");
  if (!selectedTrip) return;
  try {
    const detail = await api(`/trips/${selectedTrip.id}`);
    el.innerHTML = `
      <div class="card detail-head">
        <div>
          <h2>${esc(detail.name)}</h2>
          <div class="route">${esc(detail.origin)} → ${esc(detail.destination)} &nbsp;·&nbsp; ${esc(detail.start_date)} — ${esc(detail.end_date)}</div>
        </div>
        <div>
          <span class="state-badge state-${esc(detail.risk_state)}">${esc(detail.risk_state)}</span>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi"><div class="k-value">${detail.intervention_score != null ? detail.intervention_score.toFixed(1) : "—"}</div><div class="k-label">Intervention Score</div></div>
        <div class="kpi"><div class="k-value">${detail.bookings.length}</div><div class="k-label">Booking</div></div>
        <div class="kpi"><div class="k-value">${money(detail.bookings.reduce((s, b) => s + (b.cost || 0), 0))}</div><div class="k-label">Total Value</div></div>
        <div class="kpi"><div class="k-value">${esc(detail.risk_state)}</div><div class="k-label">Risk State</div></div>
      </div>

      <div class="card">
        <h2 class="card-title">Bookings &amp; Dependencies</h2>
        <table>
          <tr><th>Booking</th><th>Tipe</th><th>Waktu</th><th>Refund</th><th>Nilai</th><th>Status</th></tr>
          ${detail.bookings.map((b) => `
            <tr>
              <td>${esc(b.title)}<br><span class="muted">${esc(b.location)}</span></td>
              <td>${esc(b.booking_type)}</td>
              <td>${fmtTime(b.start_time)}</td>
              <td>${b.refundable_pct}%</td>
              <td>${money(b.cost)}</td>
              <td><span class="badge badge-${esc(b.status)}">${esc(b.status)}</span></td>
            </tr>`).join("")}
        </table>
      </div>

      <div class="card">
        <h2 class="card-title">Pemulihan (Recovery)</h2>
        <div class="recovery-tools" style="display:flex;gap:8px;flex-wrap:wrap;">
          <select id="selEvent" class="btn-sm" style="padding:6px 10px;border:1px solid var(--border);border-radius:4px;background:#fff;">
            <option value="">— pilih risk event —</option>
            ${events.map((e) => `<option value="${e.id}">#${e.id} ${esc(e.event_type)} @ ${esc(e.location)}</option>`).join("")}
          </select>
          <button class="btn btn-sm btn-outline" onclick="evaluateTrip()">Evaluasi Risiko</button>
          <button class="btn btn-sm btn-primary" onclick="analyzeTrip()">Analisis Agent</button>
        </div>
        <div id="evalResult" style="margin-top:12px;"></div>
        <div id="scenarioArea"></div>
      </div>

      <div class="card">
        <h2 class="card-title">Agent Activity Log</h2>
        <div id="logArea"></div>
      </div>`;
    renderScenarios();
    renderLogs();
  } catch (e) { toast(e.message, true); }
}

/* ───────────── Events ───────────── */
async function loadEvents() {
  try {
    events = await api("/risk/events");
    renderEvents();
  } catch (e) { toast(e.message, true); }
}

function renderEvents() {
  const el = $("eventList");
  if (!events.length) {
    el.innerHTML = '<p class="muted">Belum ada event risiko.</p>';
    return;
  }
  el.innerHTML = events.map((e) => `
    <div class="event-item ${esc(e.status)}">
      <div class="e-head">
        <span>${esc(e.event_type)}${e.location ? " @ " + esc(e.location) : ""}</span>
        <span class="e-sev" style="color:${e.severity >= 0.8 ? "var(--danger)" : e.severity >= 0.6 ? "var(--warning)" : "var(--success)"}">${(e.severity * 100).toFixed(0)}%</span>
      </div>
      <div class="e-meta">src: ${esc(e.source)} · conf ${(e.confidence * 100).toFixed(0)}% · ${esc(e.expected_duration)} · ${esc(e.status)}</div>
    </div>`).join("");
}

/* ───────────── Recovery flow ───────────── */
async function evaluateTrip() {
  const id = $("selEvent").value;
  if (!id) return toast("Pilih risk event dulu", true);
  const btn = event.target;
  btn.disabled = true;
  try {
    const r = await api(`/risk/evaluate/${selectedTrip.id}?risk_event_id=${id}`, { method: "POST" });
    const d = r.drivers || {};
    $("evalResult").innerHTML = `
      <div class="kpi-row">
        <div class="kpi"><div class="k-value" style="color:${stateColor[r.risk_state]}">${r.exposure_score.toFixed(1)}</div><div class="k-label">Exposure Score</div></div>
        <div class="kpi"><div class="k-value" style="font-size:18px;color:${stateColor[r.risk_state]}">${esc(r.risk_state)}</div><div class="k-label">Risk State</div></div>
        <div class="kpi"><div class="k-value" style="font-size:18px">${(d.financial_exposure_usd || 0).toFixed(0)}</div><div class="k-label">Exposure USD</div></div>
      </div>
      <div class="score-bar"><i style="width:${Math.min(100, r.exposure_score)}%;background:${stateColor[r.risk_state]}"></i></div>
      <p class="muted" style="margin-top:8px;">
        severity×conf ${(d.severity_confidence || 0).toFixed(0)} · exposure ${(d.exposure_ratio || 0).toFixed(0)}% ·
        ${d.time_to_departure_hours != null ? d.time_to_departure_hours.toFixed(0) + "h ke berangkat" : ""} ·
        deadline ${(d.deadline_proximity || 0).toFixed(0)} · financial ${(d.financial_exposure_usd || 0).toFixed(0)} · dependency ${(d.dependency_impact || 0).toFixed(0)}
      </p>`;
    toast(`Evaluasi selesai: ${r.risk_state} (${r.exposure_score.toFixed(1)})`);
  } catch (e) { toast(e.message, true); }
  btn.disabled = false;
}

async function analyzeTrip() {
  if (!selectedTrip) return;
  toast("Analisis berjalan… (butuh waktu, LLM memproses)");
  try {
    scenarios = await api(`/continuity/analyze/${selectedTrip.id}`, { method: "POST" });
    renderScenarios();
    await loadLogs();
    toast("Analisis selesai — 3 skenario dibuat");
  } catch (e) { toast(e.message, true); }
}

async function loadScenarios() {
  if (!selectedTrip) return;
  try {
    scenarios = await api(`/continuity/scenarios/${selectedTrip.id}`);
    renderScenarios();
  } catch {}
}

function renderScenarios() {
  const el = $("scenarioArea");
  if (!el) return;
  if (!scenarios.length) {
    el.innerHTML = '<p class="muted">Belum ada skenario. Jalankan "Analisis Agent".</p>';
    return;
  }
  const rankColors = { A: "#1e75e3", B: "#0064a7", C: "#10284d", D: "#909399" };
  el.innerHTML = `
    <h3 style="font-size:14px;margin:14px 0 8px;color:var(--navy)">Skenario Pemulihan</h3>
    <div class="scenario-grid">
      ${scenarios.map((s) => `
        <div class="scenario">
          <div class="scenario-head" style="background:${rankColors[s.plan_code] || "#909399"}">
            <span class="s-title">${esc(s.title)}</span>
            <span class="s-code">${esc(s.plan_code)}</span>
          </div>
          <div class="scenario-body">
            <div class="s-desc">${esc(s.description)}</div>
            <div class="s-score">
              <b>${s.overall_score != null ? s.overall_score.toFixed(0) : "—"}</b>
              <span class="muted">/100 · biaya ekstra ${money(s.additional_cost)} · nilai terjaga ${s.value_preserved_pct != null ? s.value_preserved_pct.toFixed(0) : "—"}%</span>
            </div>
            <div class="score-bar"><i style="width:${Math.min(100, s.overall_score)}%;background:${rankColors[s.plan_code] || "#1e75e3"}"></i></div>
            <div class="s-actions">
              ${(s.actions || []).map((a) => `
                <div><b>${esc(a.action)}</b> · ${esc(a.detail)}</div>`).join("")}
            </div>
            ${s.rationale ? `<div class="s-rationale">💡 ${esc(s.rationale)}</div>` : ""}
          </div>
          <div class="scenario-foot">
            <button class="btn btn-sm ${s.status === "DRAFT" ? "btn-primary" : "btn-outline"}"
                    ${s.status !== "DRAFT" ? "disabled" : ""} onclick="approveScenario(${s.id})">
              ${s.status === "APPROVED" ? "✓ Disetujui" : s.status === "EXECUTED" ? "✓ Dieksekusi" : "Approve"}
            </button>
            <button class="btn btn-sm btn-success" ${s.status !== "APPROVED" ? "disabled" : ""}
                    onclick="executeScenario(${s.id})">Eksekusi</button>
          </div>
        </div>`).join("")}
    </div>`;
}

async function approveScenario(id) {
  try {
    await api(`/continuity/scenarios/${id}/approve`, { method: "POST" });
    toast("Skenario disetujui");
    await Promise.all([loadScenarios(), loadLogs()]);
  } catch (e) { toast(e.message, true); }
}

async function executeScenario(id) {
  try {
    const r = await api(`/continuity/scenarios/${id}/execute`, { method: "POST" });
    toast("Eksekusi selesai");
    const res = r.results || [];
    $("evalResult").innerHTML += `<div class="card" style="margin-top:10px;border-left:4px solid var(--success)">
      <h3 style="font-size:14px;margin-bottom:8px;color:var(--navy)">Hasil Eksekusi</h3>
      ${res.map((x) => `<div style="font-size:12px;padding:3px 0">
        <b>${esc(x.title)}</b> → ${esc(x.provider || x.action || "OK")}${x.order_no ? " · order " + esc(x.order_no) : ""}${x.pnr ? " · PNR " + esc(x.pnr) : ""}${x.simulated ? " · (simulasi)" : ""}</div>`).join("")}
    </div>`;
    await Promise.all([loadTripDetail(), loadScenarios(), loadLogs()]);
  } catch (e) { toast(e.message, true); }
}

/* ───────────── Logs ───────────── */
async function loadLogs() {
  if (!selectedTrip) return;
  try {
    logs = await api(`/continuity/trips/${selectedTrip.id}/activities`);
    renderLogs();
  } catch {}
}

function renderLogs() {
  const el = $("logArea");
  if (!el) return;
  if (!logs.length) { el.innerHTML = '<p class="muted">Belum ada aktivitas.</p>'; return; }
  el.innerHTML = logs.map((l) => `
    <div class="log-item ${l.status === "ERROR" ? "err" : "ok"}">
      <span class="l-time">${new Date(l.created_at).toLocaleTimeString("id-ID")}</span>
      <span class="l-step">${esc(l.step)}</span>
      <span class="l-status">${esc(l.status)}</span>
      <span style="color:var(--muted)">${esc(l.summary || l.detail || "")}</span>
    </div>`).join("");
}

/* ───────────── Demo & actions ───────────── */
async function demoSeed() {
  try {
    const r = await api("/demo/seed", { method: "POST" });
    toast(`Demo seed OK — trip #${r.trip_id}`);
    await refreshAll();
  } catch (e) { toast(e.message, true); }
}

async function demoReset() {
  if (!confirm("Reset semua data? Aksi ini menghapus semua trip, booking, event, dan skenario.")) return;
  try {
    await api("/demo/reset", { method: "POST" });
    toast("Data direset");
    selectedTrip = null; scenarios = []; logs = [];
    await refreshAll();
    $("tripDetail").innerHTML = `<div class="empty-state card"><h2>Pilih trip untuk melihat detail</h2><p class="muted">Klik salah satu trip di panel kiri.</p></div>`;
  } catch (e) { toast(e.message, true); }
}

async function injectEvent(scenario) {
  try {
    const r = await api(`/risk/events/demo?scenario=${encodeURIComponent(scenario)}`, { method: "POST" });
    toast(`Event #${r.id} dibuat: ${r.event_type}`);
    await loadEvents();
    if (selectedTrip) loadTripDetail();
  } catch (e) { toast(e.message, true); }
}

async function weatherCheck() {
  try {
    const r = await api("/risk/check-weather", { method: "POST" });
    toast(`Cek cuaca selesai — ${r.length} alert`);
    await loadEvents();
  } catch (e) { toast(e.message, true); }
}

async function refreshAll() {
  await Promise.all([loadTrips(), loadEvents()]);
}

/* ───────────── Trip modal ───────────── */
$("btnNewTrip").onclick = () => $("modalTrip").classList.remove("hidden");
$("btnCancelTrip").onclick = () => $("modalTrip").classList.add("hidden");
$("btnSaveTrip").onclick = async () => {
  const body = {
    name: $("tName").value.trim(),
    origin: $("tOrigin").value.trim().toUpperCase(),
    destination: $("tDest").value.trim().toUpperCase(),
    start_date: $("tStart").value,
    end_date: $("tEnd").value,
  };
  if (!body.name || !body.origin || !body.destination || !body.start_date || !body.end_date)
    return toast("Lengkapi semua field", true);
  try {
    const t = await api("/trips", { method: "POST", body: JSON.stringify(body) });
    toast(`Trip #${t.id} dibuat`);
    $("modalTrip").classList.add("hidden");
    await refreshAll();
  } catch (e) { toast(e.message, true); }
};

$("btnDemoSeed").onclick = demoSeed;
$("btnReset").onclick = demoReset;
$("btnRefreshEvents").onclick = () => loadEvents().then(() => toast("Events di-refresh"));
$("btnWeatherCheck").onclick = weatherCheck;
document.querySelectorAll("[data-inject]").forEach((b) => {
  b.onclick = () => injectEvent(b.dataset.inject);
});

refreshAll();
