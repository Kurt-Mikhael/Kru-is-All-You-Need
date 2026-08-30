# Kru is All You Need

Agentic Trip Continuity Platform — predicts disruption, assesses risk, and executes recovery with one approval. Flight rebooking via Atlas sandbox; hotel/transport simulated.

> **Flow:** monitor → detect → score → plan → approve → execute → protected (MONITOR 18.5).

## Features

- **Autonomous monitoring** — `monitor_loop` polls Open-Meteo (weather) + FCDO/GDELT (geopolitical) every `MONITOR_INTERVAL_MINUTES`
- **Deterministic scoring** — 6 weighted drivers (severity×confidence, exposure, time-to-departure, deadline, financial, dependency) → `MONITOR <40` / `ELEVATED 40-64` / `PREPARE 65-79` / `ACT ≥80`
- **Trip Graph** — `flight → transfer → hotel → activity` domino, affected bookings highlighted
- **Financial exposure** — total / refundable / non-refundable / expiring soon / recoverable
- **Agentic planning (Groq `llama-3.3-70b-versatile`)** — 3 coordinated scenarios + rationale; REBOOK validated against `Atlas.search`
- **One-click recovery** — `Approve & Execute` rebooks flight (Live/Mock) and reschedules dependents, trip turns `MONITOR + Protected ✓`
- **Predictive vs reactive** — `SEVERE_WEATHER / STRIKE` vs `OPERATIONAL_DISRUPTION` (by `flight_booking_id`)

## Architecture

```
backend/app/main.py              # FastAPI + lifespan monitor
backend/app/monitor.py           # collect → evaluate → auto-analyze (≥65)
backend/app/api/                 # trips, bookings, risks, flights, continuity, demo
backend/app/agents/              # llm_client, scenario_generator, continuity_agent
backend/app/services/            # risk_engine, financial_exposure, trip_graph
backend/app/integrations/atlas/ # search/verify/order/pay/query
frontend/app/page.tsx            # / — globe + centered Open workspace
frontend/app/app/page.tsx        # /app — trips, events, graph, exposure, recovery
frontend/components/ui/          # TripGraph, ExposureCards
```

## Quick Start

### Docker — one command

```bash
docker compose up --build
# frontend http://localhost:3000  (/ → Open continuity workspace → /app)
# backend  http://localhost:8000  (/docs)
docker compose down        # stop
docker compose down -v     # reset DB
```

`backend/.env` is auto-loaded (`GROQ_API_KEY`, `CLIENT_KEY`, `SECRET_KEY`, `WEBHOOK_URL`).

### Local — two terminals

```bash
# backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# frontend
cd frontend && bun install && bun x next dev -p 3000
```

## Demo — 5 min (`/` → `/app`)

1. **New Trip → Load Demo Trip** (top-right of modal) — seeds `Jakarta → Tokyo` (4 bookings, 3 deps)
2. **Risk Events → Tokyo Storm** — select `SEVERE_WEATHER Tokyo`, **Evaluate Selected Event** → `PREPARE 74` + drivers
3. **Analyze Recovery Plans** — streams 7 agent steps → 3 plans + Recommended
4. **Approve & Execute** — flight rebooked (Live/Mock) + rescheduled dependents → `MONITOR 18.5 + Protected ✓`
5. **Airline Cancel** — creates `OPERATIONAL_DISRUPTION NRT` reactive (orange) → `ACT 80.5`

API alternative:

```bash
POST /api/demo/seed
POST /api/risk/events/demo?scenario=TOKYO_SEVERE_WEATHER
POST /api/risk/evaluate/{tripId}?risk_event_id={eventId}
POST /api/continuity/analyze/{tripId}?risk_event_id={id}
POST /api/continuity/scenarios/{id}/approve
POST /api/continuity/scenarios/{id}/execute
POST /api/risk/events/operational-disruption?flight_booking_id={flightId}
```

Monitor auto-runs when idle: new events → evaluate → auto-analyze if ≥65.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `GROQ_API_KEY` | — | Required |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` |  |
| `DATABASE_URL` | `sqlite:////data/trip_continuity.db` (docker) | Use Postgres in prod |
| `MONITOR_ENABLED` | `true` |  |
| `MONITOR_INTERVAL_MINUTES` | `5` |  |
| `MONITOR_TRIGGER_SCORE` | `65` |  |
| `CLIENT_KEY` / `SECRET_KEY` | — | Atlas sandbox/prod |
| `WEBHOOK_URL` | — | Atlas webhook |

## References

- `ATLAS_API_COMPLETE.md`
- `Agentic Trip Continuity Platform — 2-Week Hackathon PRD.md`
