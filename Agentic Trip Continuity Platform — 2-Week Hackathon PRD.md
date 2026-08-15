# Agentic Trip Continuity Platform

## 2-Week Hackathon Product Requirements Document

**Document Type:** Hackathon PRD
**Development Window:** 14 Days
**Product Type:** Agentic AI Travel Continuity Platform
**Primary Integration:** Atlas Flight API
**MVP Principle:** Predict → Assess → Prepare → Approve → Execute

---

# 1. Project Brief

## 1.1 Background

Travel disruptions are usually handled only after a flight has been delayed or cancelled. However, many disruptions originate from **external events that develop progressively**, such as:

- Geopolitical conflicts
- Airspace restrictions or closures
- Severe weather
- Natural hazards
- Announced transportation or airport strikes
- Regulatory or entry-policy changes

These events can generate observable warning signals hours or days before they directly affect a booking.

At the same time, a trip is rarely composed of only a flight. A traveler may have already booked:

- Multiple flight segments
- Hotels
- Airport transfers
- Rail or ground transportation
- Tours
- Activities
- Event tickets

A disruption to one component can therefore propagate through the entire itinerary.

The **Agentic Trip Continuity Platform** monitors external risks, understands these booking dependencies through a **Trip Graph**, detects when intervention becomes economically and operationally justified, and autonomously prepares coordinated recovery scenarios.

Instead of automatically modifying a trip, the system presents the traveler with **one consolidated decision** containing several ranked recovery options.

Once the traveler approves a scenario, the agent executes or simulates the required booking modifications and continues monitoring the updated itinerary.

---

## 1.2 Hackathon Objective

Within two weeks, build a working MVP capable of demonstrating the following end-to-end flow:

```text
Trip Created
    ↓
Trip Graph Generated
    ↓
External Risk Signal Detected
    ↓
Trip Exposure Evaluated
    ↓
Financial + Dependency Impact Calculated
    ↓
Intervention Threshold Triggered
    ↓
Agent Searches Alternatives
    ↓
Coordinated Recovery Scenarios Generated
    ↓
Scenarios Ranked
    ↓
Traveler Gives Single Approval
    ↓
Changes Executed / Simulated
    ↓
Updated Trip Continues to Be Monitored
```

The MVP should demonstrate **agentic orchestration and decision-making**, rather than attempting to integrate every possible travel provider.

---

# 2. Clear Problem Statement

## 2.1 Core Problem

Current travel platforms primarily optimize the **booking transaction**, but provide limited continuity management once multiple bookings have been created.

When an external disruption threatens a future trip, travelers face three major problems.

### Problem 1 — Intervention happens too late

Most systems react after an airline officially delays or cancels a flight.

By that point:

- Alternative flights may already be expensive or unavailable.
- Hotel cancellation deadlines may have passed.
- Activities may have become non-refundable.
- Transportation bookings may no longer be adjustable.
- Travelers have less time to coordinate alternatives.

The value of flexibility therefore continuously deteriorates while the traveler waits for certainty.

---

### Problem 2 — Travel bookings are treated independently

Flights, hotels, transportation, and activities are usually managed as separate transactions.

However, they form an interconnected dependency chain.

For example:

```text
Flight arrives Tokyo 09:00
        ↓
Airport Transfer 10:00
        ↓
Hotel Check-in
        ↓
Mt. Fuji Tour next morning
```

If the flight is shifted by one day, all downstream bookings may require modification.

Current platforms provide limited capability to reason about this cascading impact.

---

### Problem 3 — Travelers must manually evaluate too many trade-offs

When disruption becomes possible, travelers must compare:

- Cancellation fees
- Alternative flight prices
- Hotel flexibility
- Activity rescheduling
- Remaining availability
- Travel time
- Risk of the alternative route
- Total financial loss

The decision is therefore not simply:

> "Which alternative flight should I take?"

It is:

> **"Which coordinated modification preserves the largest portion of my entire trip?"**

---

## 2.2 Opportunity

External disruptions often create an **uncertainty window**:

```text
External Warning
      ↓
Risk Increasing
      ↓
Uncertainty Window
      ↓
Official Disruption
      ↓
Reactive Recovery
```

The platform operates primarily inside this uncertainty window.

Instead of immediately modifying bookings, the agent:

1. observes risk,
2. estimates trip exposure,
3. detects approaching flexibility deadlines,
4. prepares alternative plans,
5. recommends intervention only when justified.

Sudden airline operational issues such as aircraft maintenance or crew problems are treated differently: they act as **event-driven recovery triggers**, rather than predictive risk signals.

---

# 3. Target Users

## 3.1 Primary User — Independent Traveler

Travelers who:

- Book trips weeks or months in advance.
- Have multiple prepaid bookings.
- Travel internationally.
- Have limited flexibility after disruption.
- Prefer assistance coordinating itinerary changes.

### Main pain points

- Monitoring travel risks manually.
- Understanding which bookings are affected.
- Comparing cancellation policies.
- Searching multiple alternatives.
- Coordinating changes across providers.

### Main value proposition

> **Protect my trip and booking value before disruption becomes unavoidable.**

---

## 3.2 Secondary User — Family / Group Trip Organizer

One traveler may coordinate reservations for several people.

Their disruption impact is amplified because:

- Rebooking cost is larger.
- Finding multiple replacement seats is harder.
- Hotel and activity reservations often involve multiple participants.
- Coordination becomes significantly more complex.

---

## 3.3 Future B2B User — OTA / Travel Management Provider

Future versions could expose Trip Continuity capabilities to:

- OTAs
- Corporate travel platforms
- Travel agencies
- Tour operators
- Travel insurance companies

Potential value:

- Reduced cancellation losses
- Higher traveler retention
- Lower customer support workload
- Higher booking-value preservation
- Reduced last-minute hotel vacancies or activity no-shows

**B2B functionality is outside the hackathon MVP.**

---

# 4. Solution Overview

## 4.1 Core Product Concept

The product consists of five main layers:

### A. Trip Graph

Transforms bookings into structured interconnected entities.

Example:

```text
Trip
├── Flight CGK → NRT
│   ├── Cost
│   ├── Departure Time
│   ├── Route
│   └── Change Policy
│
├── Tokyo Hotel
│   ├── Check-in
│   ├── Cost
│   └── Free Change Deadline
│
├── Airport Transfer
│
└── Mt. Fuji Tour
```

Dependencies are stored explicitly.

Example:

```text
Flight Arrival
    → Airport Transfer
    → Hotel Check-in
    → Activity Schedule
```

For the MVP, the Trip Graph does **not require a dedicated graph database**. Relationships can be represented through PostgreSQL entities and dependency tables/JSON.

---

## 4.2 Risk Monitoring Agent

The monitoring layer consumes external risk signals.

MVP sources should be deliberately limited.

### Live / API-based source

Use at least **one real external signal**, preferably:

- Weather alerts / severe weather data

### Simulated hackathon feeds

Use controlled event injection for:

- Airspace restriction
- Geopolitical escalation
- Announced strike
- Natural hazard
- Regulatory change

This provides a reliable demo without depending on multiple unstable third-party APIs.

---

## 4.3 Trip Prioritization Engine

Every risk event is evaluated against affected trips.

### Suggested factors

| Factor                         | Example Weight |
| ------------------------------ | -------------: |
| Risk severity × confidence    |            25% |
| Geographic / route exposure    |            20% |
| Time until departure           |            15% |
| Flexibility deadline proximity |            15% |
| Financial value at risk        |            15% |
| Dependency impact              |            10% |

Example:

```text
Trip Intervention Score = 74 / 100
```

Suggested MVP states:

| Score   | State                        |
| ------- | ---------------------------- |
| 0–39   | Monitor                      |
| 40–64  | Elevated Risk                |
| 65–79  | Prepare Alternatives         |
| 80–100 | Recommend Immediate Decision |

Rules may override the score.

Example:

```text
Hotel flexibility expires in < 12 hours
AND
route risk >= HIGH
→ immediately prepare contingency scenarios
```

The scoring engine should remain **deterministic and explainable**. The LLM should interpret and orchestrate actions, but should not arbitrarily generate the core numerical risk score.

---

# 5. MVP Features

# 5.1 Must Have — Required for Demo

## MH-01 — Trip Creation

Traveler can create/import a trip containing:

- Flight
- Hotel
- Transportation
- Activity

Minimum fields:

```text
Booking ID
Provider
Location
Start/end time
Booking cost
Cancellation deadline
Change deadline
Refundability
Dependency
```

For the hackathon, hotel/activity data may be manually entered or generated from seed data.

---

## MH-02 — Trip Graph Visualization

Display itinerary components and their dependencies.

Example:

```text
CGK → NRT Flight
       │
       ├── Tokyo Hotel
       │      └── Fuji Tour
       │
       └── Airport Transfer
```

Users should immediately understand:

> If this component fails, which other bookings become affected?

---

## MH-03 — Risk Event Monitoring

Background service periodically checks external signals.

Each event should contain:

```json
{
  "event_type": "SEVERE_WEATHER",
  "location": "Tokyo",
  "severity": 0.82,
  "confidence": 0.91,
  "start_time": "...",
  "expected_duration": "...",
  "source": "..."
}
```

A **Demo Event Injector** should also exist so judges can trigger a disruption reliably.

---

## MH-04 — Trip Exposure Detection

The system matches the risk event against:

- Origin
- Destination
- Flight route
- Connection airport
- Booking location
- Booking date

Output example:

```text
Typhoon Risk — Tokyo

Affected:
✓ Flight CGK → NRT
✓ Tokyo Hotel
✓ Airport Transfer
✓ Mt. Fuji Tour

Potential Value at Risk:
$1,240
```

---

## MH-05 — Intervention Priority Score

Calculate trip intervention priority from:

- severity,
- confidence,
- geographic exposure,
- departure proximity,
- cancellation deadlines,
- financial exposure,
- dependency impact.

Display explanations such as:

```text
Priority: HIGH — 78/100

Main Drivers:
• Severe weather probability: High
• Departure: 36 hours
• Hotel free-change deadline: 9 hours
• 4 dependent bookings affected
• $1,240 booking value exposed
```

---

## MH-06 — Financial Exposure Calculator

Calculate:

```text
Total Trip Value

Current Refundable Value

Current Non-refundable Exposure

Value Becoming Non-refundable Soon

Potential Recovery Value
```

This feature makes the agent's intervention economically understandable.

---

## MH-07 — Agentic Impact Analysis

When intervention criteria are met, the continuity agent autonomously performs:

```text
Analyze Risk
      ↓
Inspect Trip Graph
      ↓
Identify Critical Dependencies
      ↓
Inspect Policies
      ↓
Calculate Financial Exposure
      ↓
Search Alternatives
      ↓
Generate Recovery Scenarios
```

The agent should expose an **activity log** so judges can see that multiple actions occurred.

Example:

```text
✓ Risk event analyzed
✓ 4 bookings impacted
✓ Hotel deadline detected
✓ Alternative flights requested
✓ 7 flights evaluated
✓ 3 feasible plans generated
✓ Recovery scenarios ranked
```

---

## MH-08 — Atlas Alternative Flight Search

Create an `AtlasAdapter` responsible for external flight operations.

Core MVP operation:

```text
searchAlternativeFlights()
```

Input:

```json
{
  "origin": "CGK",
  "destination": "NRT",
  "departure_date": "2026-09-21",
  "passengers": 2
}
```

Return normalized flight candidates.

The internal adapter is important because hackathon access may expose different Atlas operations or schemas. Atlas publicly positions its platform around API-based flight distribution for travel sellers and post-booking operations; the implementation should therefore map only the capabilities actually available through the event credentials rather than hard-coding undocumented Atlas operations.

---

## MH-09 — Coordinated Recovery Scenario Generator

Generate **three scenarios** rather than one recommendation.

Example:

### Scenario A — Depart Earlier

```text
Flight: depart 18 hours earlier
Hotel: move check-in one day earlier
Transfer: reschedule
Activity: unchanged

Additional Cost: +$140
Value Preserved: 96%
Residual Risk: Low
```

### Scenario B — Delay Trip

```text
Flight: depart +2 days
Hotel: shift dates
Transfer: shift
Activity: reschedule

Additional Cost: +$80
Value Preserved: 88%
Residual Risk: Low
```

### Scenario C — Keep Current Plan

```text
Flight: unchanged
Bookings: unchanged

Additional Cost: $0
Value Preserved Today: 100%
Potential Exposure: $1,240
Residual Risk: High
```

---

## MH-10 — Scenario Ranking Engine

Each scenario receives scores for:

| Dimension        | Purpose                         |
| ---------------- | ------------------------------- |
| Additional Cost  | Minimize incremental spending   |
| Value Preserved  | Protect prepaid bookings        |
| Trip Continuity  | Preserve original itinerary     |
| Residual Risk    | Avoid another likely disruption |
| User Constraints | Respect traveler preferences    |

Example:

```text
Scenario A
Continuity      91
Value Preserved 96
Residual Risk   88
Cost Efficiency 72
User Fit        90

Overall Score: 89
```

Again, numerical scoring should preferably use deterministic rules while the LLM generates the rationale.

---

## MH-11 — Single Approval Decision

Instead of requiring travelers to modify every component individually:

```text
Recommended Recovery Plan

Move trip forward by 18 hours

Changes:
✓ Flight
✓ Hotel
✓ Airport transfer
✓ Booking timeline

Value preserved: 96%
Additional cost: $140

[Approve Recovery Plan]
[View Alternatives]
[Keep Current Trip]
```

This is the key UX differentiator.

---

## MH-12 — Simulated Execution

After approval:

```text
Flight → Atlas booking/change operation where supported

Hotel → Mock provider adapter

Transportation → Mock provider adapter

Activity → Mock provider adapter
```

Then update:

```text
Booking statuses
Trip Graph
Financial exposure
Risk exposure
Trip timeline
```

The demo must clearly label mocked provider executions rather than pretending they are live transactions.

---

## MH-13 — Event-Driven Airline Disruption Recovery

Support one secondary trigger:

```http
POST /events/operational-disruption
```

Example:

```text
Flight officially cancelled
```

This skips predictive monitoring and immediately activates:

```text
Impact Analysis
→ Alternative Search
→ Scenario Generation
```

This demonstrates the distinction between:

**Predictive external-risk intervention**

and

**Reactive operational recovery.**

---

# 5.2 Nice to Have — If Time Allows

## NH-01 — User Travel Preferences

Store preferences such as:

```text
Maximum additional spend
Preferred airlines
Maximum connections
Arrival deadline
Seat preference
Trip dates flexibility
```

---

## NH-02 — Natural Language Policy Parser

Convert cancellation policies into structured rules.

Example:

```text
"Free cancellation until September 18 at 23:59"
```

becomes:

```json
{
  "free_cancel_until": "...",
  "refund_percentage": 100
}
```

---

## NH-03 — Proactive Notification

Example:

```text
Your Tokyo trip has moved from LOW → HIGH risk.

Your hotel remains freely changeable for another 9 hours.

3 recovery options are ready.
```

---

## NH-04 — Map-Based Exposure

Show:

```text
Risk Zone
Flight Route
Destination
Affected Booking Locations
```

---

## NH-05 — Scenario Conversation

Allow traveler to modify a scenario:

> "I don't want to leave earlier. Find options two days later under $200."

The agent regenerates scenarios around the new constraint.

---

## NH-06 — Booking Value Preservation Metric

Trip dashboard displays:

```text
Original Trip Value:       $2,200
Value Currently Protected: $2,050
Potential Loss Avoided:    $780
```

Useful for demonstrating product impact.

---

# 6. API Endpoint Plan

## 6.1 Trip APIs

| Method   | Endpoint                      | Purpose             |
| -------- | ----------------------------- | ------------------- |
| `POST` | `/api/trips`                | Create trip         |
| `GET`  | `/api/trips`                | List trips          |
| `GET`  | `/api/trips/{tripId}`       | Trip detail         |
| `PUT`  | `/api/trips/{tripId}`       | Update trip         |
| `GET`  | `/api/trips/{tripId}/graph` | Retrieve Trip Graph |

---

## 6.2 Booking APIs

| Method    | Endpoint                             | Purpose                    |
| --------- | ------------------------------------ | -------------------------- |
| `POST`  | `/api/trips/{tripId}/bookings`     | Add booking                |
| `GET`   | `/api/trips/{tripId}/bookings`     | List bookings              |
| `PATCH` | `/api/bookings/{bookingId}`        | Update booking             |
| `GET`   | `/api/bookings/{bookingId}/policy` | Retrieve normalized policy |

---

## 6.3 Risk APIs

| Method   | Endpoint                        | Purpose                |
| -------- | ------------------------------- | ---------------------- |
| `GET`  | `/api/risk/events`            | Retrieve active risks  |
| `POST` | `/api/risk/events/demo`       | Inject demo event      |
| `POST` | `/api/risk/evaluate/{tripId}` | Evaluate trip exposure |
| `GET`  | `/api/trips/{tripId}/risk`    | Trip risk state        |

---

## 6.4 Continuity Agent APIs

| Method   | Endpoint                                           | Purpose                 |
| -------- | -------------------------------------------------- | ----------------------- |
| `POST` | `/api/continuity/analyze/{tripId}`               | Trigger impact analysis |
| `POST` | `/api/continuity/scenarios/{tripId}`             | Generate scenarios      |
| `GET`  | `/api/continuity/scenarios/{tripId}`             | Retrieve scenarios      |
| `POST` | `/api/continuity/scenarios/{scenarioId}/approve` | Approve plan            |
| `POST` | `/api/continuity/scenarios/{scenarioId}/execute` | Execute modifications   |

---

## 6.5 Flight Integration APIs

Internal API:

```http
POST /api/flights/search-alternatives
```

Backend:

```text
Request
   ↓
FlightService
   ↓
AtlasAdapter
   ↓
Atlas API
   ↓
Normalize Response
   ↓
Scenario Engine
```

Do not expose Atlas-specific payload structures directly to the rest of the application.

---

## 6.6 Demo Trigger APIs

```http
POST /api/demo/events
```

Example:

```json
{
  "scenario": "TOKYO_SEVERE_WEATHER"
}
```

Other predefined scenarios:

```text
TOKYO_SEVERE_WEATHER

MIDDLE_EAST_AIRSPACE_RESTRICTION

AIRPORT_STRIKE

REGULATORY_CHANGE

AIRLINE_CANCELLATION
```

This endpoint is extremely useful for deterministic judging demos.

---

# 7. Suggested Project Structure

## 7.1 Recommended Stack

### Frontend

```text
Next.js
TypeScript
Tailwind CSS
React Query / native fetch
```

### Backend

```text
FastAPI
Python
Pydantic
SQLAlchemy
```

Python is useful for:

- Agent orchestration
- Risk calculations
- LLM integration
- Provider adapters
- Data processing

### Database

```text
PostgreSQL
```

Avoid introducing Neo4j purely because the system contains a "Trip Graph."

For the MVP:

```text
Booking table
+
Booking dependency table
```

is sufficient.

---

## 7.2 Repository Structure

```text
trip-continuity/
│
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── trips/
│   │   ├── risk/
│   │   └── recovery/
│   │
│   ├── components/
│   │   ├── trip-graph/
│   │   ├── risk-card/
│   │   ├── exposure-card/
│   │   ├── scenario-card/
│   │   └── agent-activity/
│   │
│   └── lib/
│
├── backend/
│   │
│   ├── api/
│   │   ├── trips.py
│   │   ├── bookings.py
│   │   ├── risks.py
│   │   ├── flights.py
│   │   └── continuity.py
│   │
│   ├── agents/
│   │   ├── continuity_agent.py
│   │   ├── impact_analyzer.py
│   │   ├── scenario_generator.py
│   │   └── scenario_ranker.py
│   │
│   ├── services/
│   │   ├── trip_graph.py
│   │   ├── risk_engine.py
│   │   ├── financial_exposure.py
│   │   └── policy_engine.py
│   │
│   ├── integrations/
│   │   ├── atlas/
│   │   │   ├── client.py
│   │   │   ├── mapper.py
│   │   │   └── schemas.py
│   │   │
│   │   ├── weather/
│   │   ├── hotel_mock.py
│   │   ├── activity_mock.py
│   │   └── transport_mock.py
│   │
│   ├── models/
│   ├── schemas/
│   ├── database/
│   └── main.py
│
├── seed/
│   ├── trips.json
│   ├── bookings.json
│   └── risk-events.json
│
└── README.md
```

---

# 8. Two-Week Execution Timeline

The key implementation principle is:

> **Finish one complete working scenario first, then expand functionality.**

Do not build each subsystem independently and attempt integration on the final days.

---

## Day 1 — Scope Freeze + Demo Story

### Tasks

- Freeze MVP scope.
- Define core user journey.
- Define Trip Graph schema.
- Define booking schema.
- Define risk event schema.
- Define intervention scoring.
- Select one primary demo trip.
- Validate available Atlas API access.

### Demo scenario

Recommended:

```text
Jakarta → Tokyo

Flight
Hotel
Airport Transfer
Activity

External Event:
Severe weather threatening Tokyo

Critical Trigger:
Hotel flexibility expires in 9 hours
```

### Deliverable

```text
Architecture finalized
Database schema finalized
API contracts finalized
Demo narrative finalized
```

---

## Day 2 — Project Setup + Core Data Model

### Backend

Implement:

```text
Trip
Booking
BookingDependency
RiskEvent
RiskAssessment
Scenario
ScenarioAction
```

### Frontend

Create:

```text
Dashboard shell
Trip detail shell
Recovery page shell
```

### Deliverable

User can create and retrieve a trip.

---

## Day 3 — Trip Graph

Implement:

```text
Trip → Bookings
Booking → Dependencies
Booking → Policy
Booking → Financial Value
```

Frontend:

Build visual Trip Graph.

### Deliverable

End-to-end itinerary dependencies visible.

---

## Day 4 — Risk Monitoring

Implement:

```text
Risk ingestion
Risk normalization
Demo risk injector
Location matching
Route matching
```

Connect one real risk source if available.

### Deliverable

Risk event can automatically identify an exposed trip.

---

## Day 5 — Risk Prioritization Engine

Implement:

```text
Severity
Confidence
Exposure
Time until departure
Deadline proximity
Financial exposure
Dependency impact
```

Generate:

```text
Intervention Score
Risk Level
Main Risk Drivers
```

### Deliverable

Trip moves automatically between:

```text
MONITOR
ELEVATED
PREPARE
ACT
```

---

## Day 6 — Financial Exposure + Policy Engine

Implement:

```text
Refundable value
Non-refundable value
Upcoming flexibility deadlines
Potential value at risk
```

Add deadline awareness.

### Deliverable

System explains **why acting now matters financially**.

---

## Day 7 — Atlas Integration

Implement:

```text
AtlasAdapter
Flight search
Flight normalization
Alternative filtering
```

Fallback:

Create mocked Atlas response fixtures so the demo remains functional if external connectivity fails.

### Deliverable

Given an affected flight, system returns replacement options.

---

# WEEK 2

## Day 8 — Agentic Orchestration

Implement Continuity Agent workflow:

```text
Risk Trigger
      ↓
Impact Analysis
      ↓
Dependency Analysis
      ↓
Financial Analysis
      ↓
Policy Analysis
      ↓
Alternative Search
      ↓
Scenario Generation
```

Add agent activity logging.

### Deliverable

One API call launches the full analysis workflow.

---

## Day 9 — Scenario Generation

Generate three coordinated plans:

```text
Plan A — Leave Earlier

Plan B — Delay Trip

Plan C — Keep Existing Plan
```

Each plan modifies multiple bookings.

### Deliverable

Valid structured recovery scenarios.

---

## Day 10 — Scenario Ranking

Implement scoring:

```text
Additional Cost
Value Preserved
Trip Continuity
Residual Risk
User Constraints
```

Generate recommendation rationale.

### Deliverable

System automatically selects a recommended plan.

---

## Day 11 — Approval + Execution

Frontend:

Create single-decision recovery interface.

Backend:

Implement:

```text
Approve Scenario
Execute Scenario
Update Booking
Update Trip Graph
```

Use mocked execution for unsupported providers.

### Deliverable

User approves a recovery plan and trip state changes.

---

## Day 12 — Operational Disruption Trigger + UX Polish

Implement:

```text
Official Flight Cancellation
        ↓
Immediate Recovery Workflow
```

Improve:

- Risk indicators
- Financial exposure cards
- Scenario comparison
- Agent activity
- Trip Graph states

### Deliverable

Both predictive and reactive flows work.

---

## Day 13 — Full Integration Testing

Run complete demo repeatedly.

Test:

```text
Risk detected?
Exposure calculated?
Threshold triggered?
Atlas searched?
Scenarios generated?
Ranking correct?
Approval works?
Execution updates graph?
```

Prepare fallback fixtures for every external API.

### Deliverable

Stable end-to-end demo.

---

## Day 14 — Demo Optimization

Focus only on:

```text
Demo reliability
Pitch
Storytelling
Metrics
UI polish
Fallback handling
```

Freeze major development.

Prepare reset script:

```text
/reset-demo
```

so the entire experience can be demonstrated repeatedly.

---

# 9. Recommended Hackathon Demo

The strongest demo should tell **one complete story** instead of demonstrating disconnected features.

## Step 1 — Show Existing Trip

```text
Jakarta → Tokyo

Flight                 $720
Hotel                  $600
Airport Transfer        $80
Mt. Fuji Tour           $160

Trip Value            $1,560
```

Everything initially appears healthy.

---

## Step 2 — Inject External Risk

Trigger:

```text
Severe weather developing around Tokyo
```

Dashboard changes:

```text
Risk Level
LOW → HIGH

Intervention Score
78 / 100
```

---

## Step 3 — Agent Detects Time Pressure

Display:

```text
Departure: 36 hours

Hotel free-change deadline:
9 hours remaining

Bookings exposed:
4

Financial exposure:
$1,240
```

This establishes **why the platform should act before cancellation**.

---

## Step 4 — Show Agent Working

Activity feed:

```text
✓ Weather signal validated

✓ Route exposure detected

✓ Trip Graph analyzed

✓ 4 dependent reservations identified

✓ Financial exposure calculated

✓ Flexibility deadline detected

✓ Alternative flights searched

✓ 7 alternatives evaluated

✓ 3 coordinated plans generated
```

---

## Step 5 — Present Recovery Scenarios

Example:

|                 |       Plan A | Plan B | Keep Trip |
| --------------- | -----------: | -----: | --------: |
| Additional Cost |         $140 |    $80 |        $0 |
| Value Preserved |          96% |    88% |     100%* |
| Residual Risk   |          Low |    Low |      High |
| Continuity      |          92% |    80% |      100% |
| Score           | **89** |     82 |        61 |

`*Current value only; significant value remains exposed if disruption materializes.`

Recommendation:

```text
PLAN A

Leave 18 hours earlier.
```

---

## Step 6 — Single Approval

Traveler clicks:

```text
[ Approve Recovery Plan ]
```

The agent coordinates:

```text
Flight → Rebook

Hotel → Extend / Move

Transfer → Reschedule

Activity → Retain
```

---

## Step 7 — Show Outcome

```text
Trip protected.

Original Trip Value:
$1,560

Additional Cost:
$140

Booking Value Preserved:
$1,498

Residual Risk:
LOW
```

Trip Graph updates automatically.

This final screen should clearly demonstrate the project's central value:

> **The system does not simply predict disruption. It converts early risk signals into coordinated actions that preserve the trip.**

---

# 10. MVP Success Criteria

The hackathon MVP is successful if judges can observe all of the following in one demonstration:

- [ ] A multi-booking trip exists.
- [ ] Dependencies between bookings are represented.
- [ ] An external risk signal is detected.
- [ ] The system determines whether the trip is exposed.
- [ ] Risk priority is calculated transparently.
- [ ] Financial value at risk is calculated.
- [ ] Flexibility deadlines affect intervention urgency.
- [ ] The agent autonomously launches analysis.
- [ ] Alternative flights are searched through the Atlas integration layer.
- [ ] Multiple coordinated scenarios are produced.
- [ ] Scenarios are ranked using explicit trade-offs.
- [ ] Traveler receives one consolidated approval decision.
- [ ] Approved changes are executed or transparently simulated.
- [ ] Trip Graph and financial exposure update afterward.

---

# 11. Explicit Hackathon Non-Goals

To keep the project achievable in two weeks, the MVP should **not** attempt to build:

- Full OTA booking infrastructure
- Global geopolitical intelligence system
- Real-time monitoring of every airline
- Full hotel marketplace integration
- Full activity marketplace integration
- Payment processing
- Automatic rebooking without traveler consent
- Production-grade refund processing
- Dedicated graph database
- Machine-learning disruption prediction model
- Native mobile applications

The innovation should come from **coordination and agentic decision-making**, not from maximizing the number of APIs integrated.

---

# 12. Post-Hackathon Roadmap

## Phase 1 — Real Provider Connectivity

### Objective

Move from simulated coordination toward actual travel provider operations.

Add:

- Hotel APIs
- Ground transportation APIs
- Activity booking APIs
- Airline post-booking operations
- Refund / credit workflows

---

## Phase 2 — External Risk Intelligence Layer

Expand live monitoring to:

```text
Weather
Natural hazards
Airspace restrictions
Airport operations
Government travel advisories
Strike announcements
Regulatory changes
Geopolitical signals
```

Add:

```text
Source credibility scoring
Event deduplication
Cross-source confirmation
Risk confidence calculation
```

---

## Phase 3 — Advanced Trip Graph

Develop richer dependency logic.

Examples:

```text
Flight delay > 5h
→ airport transfer invalid

Arrival date +1 day
→ hotel modification needed

Hotel date shifted
→ activity schedule conflict

Connection cancelled
→ all downstream segments exposed
```

Support larger:

- Multi-city trips
- Group trips
- Connecting journeys
- Cruises
- Package tours

---

## Phase 4 — Personalized Continuity Agent

Learn traveler constraints and preferences.

Example:

```text
"I would rather spend another $150 than lose one vacation day."

"Never route me through two connections."

"Keep the hotel whenever possible."

"I must arrive before Monday morning."
```

Scenario ranking becomes personalized rather than generic.

---

## Phase 5 — Provider-Side Continuity

Introduce provider incentives.

Instead of:

```text
Traveler cancels hotel
→ Provider loses reservation
```

the agent could negotiate:

```text
Change dates

Issue credit

Extend validity

Partial refund

Retain reservation value
```

This creates value for both sides:

```text
Traveler
→ Lower financial loss

Provider
→ Higher revenue retention
```

---

## Phase 6 — B2B Continuity Infrastructure

Expose the continuity engine as APIs to:

```text
OTAs
Corporate travel platforms
Travel agencies
Airlines
Travel insurers
Tour operators
```

Potential architecture:

```text
OTA Booking System
        ↓
Trip Continuity API
        ↓
Trip Graph
        ↓
Risk Intelligence
        ↓
Agentic Recovery Engine
        ↓
Provider Network
```

The long-term positioning becomes:

> **A continuity intelligence and orchestration layer sitting between travel bookings, external risk signals, and travel providers.**

---

# Final Product Positioning

Traditional travel platforms answer:

> **"How do I book this trip?"**

Disruption-management platforms answer:

> **"What should I do after my flight is cancelled?"**

The Agentic Trip Continuity Platform instead answers:

> **"My trip may become disrupted. What should I protect now, what are my alternatives, and which coordinated decision preserves the most value?"**

The key differentiation is therefore not disruption prediction alone, but the combination of:

**Early Risk Detection + Trip Dependency Understanding + Financial Exposure + Autonomous Scenario Preparation + Coordinated Recovery + Human Approval.**
