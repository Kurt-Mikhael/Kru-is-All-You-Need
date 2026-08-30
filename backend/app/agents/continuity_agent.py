from sqlalchemy import select
from sqlalchemy.orm import Session

from ..integrations.atlas import adapter
from ..models import AgentLogEntry, Booking, BookingDependency, Scenario, Trip
from ..services import financial_exposure as fe_service
from ..services import trip_graph as graph_service
from . import llm_client
from .scenario_generator import generate_scenarios


def run_analysis(db: Session, trip, risk_event, assessment) -> list[Scenario]:
    _log(db, trip.id, "analyze_risk", "OK", "Risk event analyzed", f"{risk_event.event_type} at {risk_event.location}")
    affected_ids = assessment.affected_booking_ids

    _log(db, trip.id, "inspect_trip_graph", "OK", f"Trip graph inspected, {len(affected_ids)} bookings affected", "")
    deps = _dependency_count(db, trip.id)
    _log(db, trip.id, "identify_dependencies", "OK", f"{deps} dependent reservations identified", "")

    exposure = fe_service.get_financial_exposure(db, trip.id, affected_ids)
    _log(
        db,
        trip.id,
        "financial_exposure",
        "OK",
        f"Financial exposure calculated: ${exposure.non_refundable_exposure:.2f} at risk",
        "",
    )

    deadline_note = _nearest_deadline(db, affected_ids)
    if deadline_note:
        _log(db, trip.id, "flexibility_deadline", "OK", deadline_note, "")

    alternatives = adapter.search_alternative_flights(
        trip.origin, trip.destination, trip.start_date, passengers=max(1, len(affected_ids) // 2)
    )
    _log(db, trip.id, "search_alternatives", "OK", f"{len(alternatives)} alternative flights evaluated", "")

    scenarios = generate_scenarios(trip, _bookings(db, trip.id), affected_ids, risk_event, alternatives)
    _log(db, trip.id, "generate_scenarios", "OK", f"{len(scenarios)} coordinated plans generated", "")

    ranked = sorted(scenarios, key=lambda s: s["overall_score"], reverse=True)
    _log(db, trip.id, "rank_scenarios", "OK", f"Recovery scenarios ranked; best: Plan {ranked[0]['plan_code']}", "")

    rationale = _rationale(trip, risk_event, ranked[0])
    _log(db, trip.id, "rationale", "OK", rationale, "")

    saved = []
    for sc in scenarios:
        model = Scenario(
            trip_id=trip.id,
            risk_event_id=risk_event.id,
            plan_code=sc["plan_code"],
            title=sc["title"],
            description=sc.get("description", ""),
            actions=sc["actions"],
            scores=sc["scores"],
            overall_score=sc["overall_score"],
            additional_cost=sc.get("additional_cost", 0),
            value_preserved_pct=sc.get("value_preserved_pct", 100),
            residual_risk=sc.get("residual_risk", "MEDIUM"),
            rationale=rationale if sc["plan_code"] == ranked[0]["plan_code"] else "",
        )
        db.add(model)
        saved.append(model)
    db.commit()
    for s in saved:
        db.refresh(s)
    return saved


def _log(db: Session, trip_id: int, step: str, status: str, summary: str, detail: str) -> None:
    db.add(AgentLogEntry(trip_id=trip_id, step=step, status=status, summary=summary, detail=detail))
    db.commit()


def _bookings(db: Session, trip_id: int) -> list[Booking]:
    return list(db.scalars(select(Booking).where(Booking.trip_id == trip_id)).all())


def _dependency_count(db: Session, trip_id: int) -> int:
    return len(db.scalars(select(BookingDependency).where(BookingDependency.trip_id == trip_id)).all())


def _nearest_deadline(db: Session, booking_ids: list[int]) -> str:
    from datetime import datetime

    bookings = db.scalars(select(Booking).where(Booking.id.in_(booking_ids))).all()
    best = None
    for b in bookings:
        if not b.change_deadline:
            continue
        try:
            hours = (datetime.strptime(b.change_deadline, "%Y%m%dT%H%M") - datetime.utcnow()).total_seconds() / 3600
            if hours > 0 and (best is None or hours < best[1]):
                best = (b, hours)
        except ValueError:
            continue
    if not best:
        return ""
    return f"{best[0].title} free-change deadline in {best[1]:.0f} hours"


def _rationale(trip, risk_event, top) -> str:
    prompt = (
        f"Trip {trip.name} ({trip.origin}->{trip.destination}) faces {risk_event.event_type} "
        f"at {risk_event.location} (severity {risk_event.severity}, confidence {risk_event.confidence}). "
        f"Recommended plan: {top['title']} costing ${top.get('additional_cost', 0)}. "
        "Explain in one or two sentences why this preserves the most trip value."
    )
    text = llm_client.complete_text(
        "You are a concise travel advisor. Answer in plain text, 1-2 sentences.", prompt
    )
    return text or f"Plan {top['plan_code']} ({top['title']}) balances cost and trip protection best."


def execute_scenario(db: Session, scenario: Scenario) -> list[dict]:
    from ..schemas import AlternativeFlight

    results = []
    for action in scenario.actions:
        booking = db.get(Booking, action.get("booking_id"))
        if not booking:
            continue

        action_name = str(action.get("action", "KEEP")).upper()
        new_time = action.get("new_time") or booking.start_time
        if action_name == "KEEP":
            results.append(
                {
                    "booking_id": booking.id,
                    "title": booking.title,
                    "booking_type": booking.booking_type,
                    "action": action_name,
                    "new_time": booking.start_time,
                    "status": booking.status,
                    "provider": "",
                    "simulated": False,
                    "provenance": "UNCHANGED",
                }
            )
            continue

        if action_name == "CANCEL":
            booking.status = "CANCELLED"
            db.add(booking)
            results.append(
                {
                    "booking_id": booking.id,
                    "title": booking.title,
                    "booking_type": booking.booking_type,
                    "action": action_name,
                    "new_time": booking.start_time,
                    "status": booking.status,
                    "provider": "",
                    "simulated": True,
                    "provenance": "SIMULATED",
                }
            )
            continue

        if action_name == "REBOOK" and booking.booking_type.lower() == "flight":
            from ..integrations.atlas import adapter as atlas_adapter

            alt = AlternativeFlight(
                flight_number=action.get("flight_number", ""),
                origin=booking.trip.origin if booking.trip else "",
                destination=booking.location,
                dep_time=new_time,
                arr_time="",
                price=action.get("flight_price", booking.cost),
                currency="USD",
                carrier=action.get("flight_number", "")[:2],
                segments=1,
                stops=0,
                provider_ref=action.get("provider_ref", ""),
            )
            provider_result = atlas_adapter.book_alternative_flight(alt, passengers=1)
            booking.start_time = new_time
            booking.external_ref = (
                provider_result.get("order_no")
                or provider_result.get("pnr")
                or booking.external_ref
            )
            provider = provider_result.get("provider") or booking.provider
            simulated = bool(provider_result.get("simulated", provider.upper() == "MOCK"))
            booking.provider = provider
            booking.status = "CONFIRMED" if provider_result.get("ticketed") else "CHANGED"
            db.add(booking)
            results.append(
                {
                    "booking_id": booking.id,
                    "title": booking.title,
                    "booking_type": booking.booking_type,
                    "action": action_name,
                    "new_time": booking.start_time,
                    "status": booking.status,
                    "provider": provider,
                    "simulated": simulated,
                    "provenance": "SIMULATED" if simulated else "LIVE_ATLAS",
                    "external_ref": booking.external_ref,
                    **provider_result,
                }
            )
            continue

        booking.start_time = new_time
        booking.status = "CHANGED"
        db.add(booking)
        results.append(
            {
                "booking_id": booking.id,
                "title": booking.title,
                "booking_type": booking.booking_type,
                "action": action_name,
                "new_time": booking.start_time,
                "status": booking.status,
                "provider": booking.provider,
                "simulated": True,
                "provenance": "SIMULATED",
            }
        )
    scenario.status = "EXECUTED"
    db.add(scenario)
    db.commit()
    return results