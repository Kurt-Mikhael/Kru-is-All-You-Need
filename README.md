# Agentic Trip Continuity Platform

AI agent yang memantau trip perjalanan secara otomatis dan menyusun rencana pemulihan (recovery plan) ketika risiko muncul — cuaca buruk, konflik geopolitik, atau pembatalan maskapai.

**Konsep:** user cukup 2x interaksi — input data booking di awal, klik approve di tengah. Sistem yang jalankan sisanya: pantau → deteksi bahaya → nilai risiko → susun rencana → eksekusi (flight rebooking via Atlas sandbox).

## Fitur

- **Risk monitoring otomatis** — scheduler setiap N menit mengecek:
  - Cuaca parah via [Open-Meteo](https://open-meteo.com) (real)
  - Geopolitik via [FCDO UK gov.uk](https://www.gov.uk/foreign-travel-advice) (real), fallback [GDELT](https://www.gdeltproject.org)
- **Risk scoring** — 6 faktor berbobot (severity×confidence, exposure, time-to-departure, deadline proximity, financial, dependency) → state `MONITOR` < 40, `ELEVATED` 40–64, `PREPARE` 65–79, `ACT` ≥ 80
- **Financial exposure** — nilai uang yang terancam per booking (refundability × deadline)
- **Agentic analysis (Groq LLM)** — interpretasi risiko, generate 3 skenario pemulihan, rationale; divalidasi deterministik (aksi REBOOK wajib pakai flight dari hasil search Atlas)
- **Scenario ranking** — continuity, value preserved, residual risk, cost efficiency, user fit
- **Single approval** — eksekusi hanya setelah user approve
- **Flight rebooking real** — `search.do → verify.do → order.do → pay.do → queryOrderDetails.do` di sandbox Atlas; fallback simulasi bila gagal
- **Trip graph & dependencies** — booking dependency (tour → hotel → flight)

## Arsitektur

```
backend/
├── app/
│   ├── main.py                 # entrypoint FastAPI + lifespan monitor
│   ├── config.py               # env vars (Groq, database, monitor)
│   ├── models.py / schemas.py  # ORM + Pydantic
│   ├── monitor.py              # background loop: collect events → evaluate → auto-analyze
│   ├── api/                    # REST routes (trips, bookings, risks, flights, continuity, demo)
│   ├── agents/                 # llm_client, scenario_generator, scenario_ranker, continuity_agent
│   ├── services/               # risk_engine, financial_exposure, trip_graph, policy_engine
│   └── integrations/
│       ├── atlas/              # client (search/verify/order/pay/query), mapper, fixtures, adapter
│       ├── geopolitical.py     # FCDO primary + GDELT fallback
│       ├── weather.py          # Open-Meteo primary + mock fallback
│       └── mock_providers.py   # simulated execution (hotel/transport/activity)
```

## Quick Start

```powershell
# 1. Setup
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 2. Env — isi GROQ_API_KEY (wajib), CLIENT_KEY/SECRET_KEY Atlas (opsional)
# copy dari .env.example
```

```powershell
# 3. Jalankan
uvicorn app.main:app --port 8000
```

Dokumentasi API otomatis di `http://127.0.0.1:8000/docs`.

## Alur Demo

```powershell
# 1. Seed trip demo (Jakarta→Tokyo, 4 booking + dependencies)
POST /api/demo/seed

# 2. Inject event risiko
POST /api/risk/events/demo?scenario=TOKYO_SEVERE_WEATHER

# 3. Evaluasi risiko trip
POST /api/risk/evaluate/1?risk_event_id=<event_id>

# 4. Analisis agent (3 skenario)
POST /api/continuity/analyze/1

# 5. Approve skenario terbaik
POST /api/continuity/scenarios/1/approve

# 6. Eksekusi (flight → Atlas sandbox, sisanya simulasi)
POST /api/continuity/scenarios/1/execute
```

Atau biarkan monitor jalan otomatis: event cuaca/geopolitik muncul sendiri, trip dievaluasi, dan bila score ≥ `MONITOR_TRIGGER_SCORE` (65) sistem otomatis menyusun skenario — user tinggal approve.

## Konfigurasi (.env)

| Variable | Default | Keterangan |
|---|---|---|
| `GROQ_API_KEY` | — | Wajib, untuk LLM |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Model Groq |
| `DATABASE_URL` | `sqlite:///trip_continuity.db` | SQLite default; ganti ke Postgres bila perlu |
| `MONITOR_ENABLED` | `true` | Nyalakan scheduler |
| `MONITOR_INTERVAL_MINUTES` | `5` | Interval cek risiko |
| `MONITOR_TRIGGER_SCORE` | `65` | Skor yang memicu auto-analyze |
| `CLIENT_KEY` / `SECRET_KEY` | — | Kredensial Atlas (sandbox/production) |

## Referensi

- [ATLAS_API_COMPLETE.md](ATLAS_API_COMPLETE.md) — integrasi API Atlas (search, verify, order, pay, query, error handling)
- [Agentic Trip Continuity Platform — PRD](Agentic%20Trip%20Continuity%20Platform%20%E2%80%94%202-Week%20Hackathon%20PRD.md) — spesifikasi produk
