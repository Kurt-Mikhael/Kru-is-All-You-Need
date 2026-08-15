from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Booking, BookingDependency, RiskAssessment, RiskEvent, Trip

RISK_STATES = [
    (80.0, "ACT"),
    (65.0, "PREPARE"),
    (40.0, "ELEVATED"),
    (0.0, "MONITOR"),
]

WEIGHTS = {
    "severity_confidence": 0.25,
    "exposure": 0.20,
    "time_to_departure": 0.15,
    "deadline_proximity": 0.15,
    "financial_exposure": 0.15,
    "dependency_impact": 0.10,
}

EVENT_LOCATION_MAP = {
    "Tokyo": {"TOKYO", "NRT", "HND"},
    "Jakarta": {"JAKARTA", "CGK"},
    "Middle East": {"MIDDLE EAST", "DXB", "AUH", "DOH"},
}


def evaluate_trip(db: Session, trip_id: int, risk_event_id: int) -> RiskAssessment:
    trip = db.get(Trip, trip_id)
    event = db.get(RiskEvent, risk_event_id)
    if not trip or not event:
        raise ValueError("trip or risk event not found")

    bookings = db.scalars(select(Booking).where(Booking.trip_id == trip_id)).all()
    exposed = _exposed_bookings(trip, event, bookings)

    exposure_factor = len(exposed) / max(1, len(bookings))
    time_to_departure = _time_factor(trip.start_date)
    deadline_factor = _deadline_factor(bookings)
    financial = sum(b.cost for b in exposed)
    financial_factor = min(1.0, financial / 2000.0)
    dependency_factor = _dependency_factor(db, trip_id, exposed)

    severity_confidence = event.severity * event.confidence
    score = (
        WEIGHTS["severity_confidence"] * severity_confidence * 100
        + WEIGHTS["exposure"] * exposure_factor * 100
        + WEIGHTS["time_to_departure"] * time_to_departure * 100
        + WEIGHTS["deadline_proximity"] * deadline_factor * 100
        + WEIGHTS["financial_exposure"] * financial_factor * 100
        + WEIGHTS["dependency_impact"] * dependency_factor * 100
    )
    score = round(min(100.0, max(0.0, score)), 1)

    state = next(state for threshold, state in RISK_STATES if score >= threshold)
    if state == "PREPARE" or state == "ELEVATED":
        state = _rule_override(trip, bookings, event)

    drivers = {
        "severity_confidence": round(severity_confidence * 100, 1),
        "exposure_ratio": round(exposure_factor * 100, 1),
        "time_to_departure_hours": round(time_to_departure * 168, 1),
        "deadline_proximity": round(deadline_factor * 100, 1),
        "financial_exposure_usd": round(financial, 2),
        "dependency_impact": round(dependency_factor * 100, 1),
    }

    assessment = RiskAssessment(
        trip_id=trip_id,
        risk_event_id=risk_event_id,
        exposure_score=score,
        affected_booking_ids=[b.id for b in exposed],
        drivers=drivers,
    )
    db.add(assessment)
    trip.risk_state = state
    trip.intervention_score = score
    db.commit()
    db.refresh(assessment)
    return assessment


def _exposed_bookings(trip: Trip, event: RiskEvent, bookings: list[Booking]) -> list[Booking]:
    event_locs = EVENT_LOCATION_MAP.get(event.location, set())
    if not event_locs:
        event_locs = {event.location}
    exposed = []
    for b in bookings:
        if _overlaps(b.location, event_locs) or _overlaps(b.booking_type, event_locs):
            exposed.append(b)
    if not exposed and any(loc in (trip.origin, trip.destination) for loc in event_locs):
        exposed = bookings[:]
    return exposed


def _overlaps(value: str, locs: set[str]) -> bool:
    value = value.upper()
    return any(loc.upper() in value or value in loc.upper() for loc in locs)


def _time_factor(start_date: str) -> float:
    try:
        dep = datetime.strptime(start_date, "%Y-%m-%d")
        days = (dep - datetime.utcnow()).days
        if days < 0:
            return 1.0
        return max(0.0, min(1.0, 1.0 - days / 14.0))
    except ValueError:
        return 0.5


def _deadline_factor(bookings: list[Booking]) -> float:
    if not bookings:
        return 0.0
    factors = []
    for b in bookings:
        if not b.change_deadline:
            continue
        try:
            deadline = datetime.strptime(b.change_deadline, "%Y%m%dT%H%M")
            hours = (deadline - datetime.utcnow()).total_seconds() / 3600
            if hours <= 0:
                factors.append(1.0)
            else:
                factors.append(max(0.0, min(1.0, 1.0 - hours / 72.0)))
        except ValueError:
            continue
    return sum(factors) / max(1, len(factors))


def _dependency_factor(db: Session, trip_id: int, exposed: list[Booking]) -> float:
    exposed_ids = {b.id for b in exposed}
    deps = db.scalars(
        select(BookingDependency).where(
            BookingDependency.trip_id == trip_id,
            BookingDependency.depends_on_booking_id.in_(exposed_ids),
        )
    ).all()
    affected = len({d.dependent_booking_id for d in deps} - exposed_ids)
    return min(1.0, affected / 5.0)


def _rule_override(trip: Trip, bookings: list[Booking], event: RiskEvent) -> str:
    from ..services.policy_engine import get_deadline_proximity

    now = datetime.utcnow().strftime("%Y%m%dT%H%M")
    near_deadline = any(get_deadline_proximity(b, now) >= 0.8 for b in bookings if b.change_deadline)
    if event.severity * event.confidence >= 0.5 and near_deadline:
        return "PREPARE"
    return trip.risk_state