from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Booking, Policy, RiskEvent, Trip
from ..schemas import BookingOut, TripOut

router = APIRouter(prefix="/api/demo", tags=["demo"])

_NOW = datetime.utcnow()


def _ts(hours_ahead: int) -> str:
    return (_NOW + timedelta(hours=hours_ahead)).strftime("%Y%m%dT%H%M")


def _date(hours_ahead: int) -> str:
    return (_NOW + timedelta(hours=hours_ahead)).strftime("%Y-%m-%d")


SEED_TRIP = {
    "name": "Jakarta to Tokyo",
    "origin": "CGK",
    "destination": "NRT",
    "start_date": _date(36),
    "end_date": _date(36 + 144),
}

SEED_BOOKINGS = [
    dict(booking_type="flight", provider="Atlas", title="Flight CGK to NRT", location="NRT", start_time=_ts(36), end_time=_ts(46), cost=720.0, currency="USD", cancel_deadline="", change_deadline=_ts(30), refundable_pct=50.0, external_ref=""),
    dict(booking_type="hotel", provider="MockHotel", title="Tokyo Hotel", location="Tokyo", start_time=_ts(43), end_time=_ts(48 * 7), cost=600.0, currency="USD", cancel_deadline=_ts(9), change_deadline=_ts(9), refundable_pct=90.0),
    dict(booking_type="transport", provider="MockTransfer", title="Airport Transfer", location="NRT", start_time=_ts(47), end_time=_ts(48), cost=80.0, currency="USD", cancel_deadline=_ts(24), change_deadline=_ts(24), refundable_pct=100.0),
    dict(booking_type="activity", provider="MockTour", title="Mt. Fuji Tour", location="Tokyo", start_time=_ts(72), end_time=_ts(82), cost=160.0, currency="USD", cancel_deadline=_ts(36), change_deadline=_ts(36), refundable_pct=70.0),
]


@router.post("/events")
def trigger_demo(scenario: str, db: Session = Depends(get_db)):
    from .risks import DEMO_EVENTS, inject_demo

    template = DEMO_EVENTS.get(scenario.upper())
    if not template:
        raise HTTPException(404, f"unknown demo scenario: {scenario}")
    return inject_demo(scenario.upper(), db)


@router.post("/reset")
def reset_demo(db: Session = Depends(get_db)):
    from ..models import AgentLogEntry, Booking, BookingDependency, Policy, RiskAssessment, Scenario

    for model in (AgentLogEntry, Scenario, RiskAssessment, BookingDependency, Policy, Booking, RiskEvent, Trip):
        for row in db.scalars(select(model)).all():
            db.delete(row)
    db.commit()
    return {"status": "reset"}


@router.post("/seed", response_model=dict)
def seed_demo(db: Session = Depends(get_db)):
    trip = Trip(**SEED_TRIP)
    db.add(trip)
    db.flush()
    booking_ids = []
    for b in SEED_BOOKINGS:
        booking = Booking(trip_id=trip.id, **b)
        db.add(booking)
        db.flush()
        booking_ids.append(booking.id)
        policy = Policy(
            booking_id=booking.id,
            rules={"free_cancel_until": b.get("cancel_deadline", ""), "refund_percentage": b.get("refundable_pct", 0), "change_allowed": True},
        )
        db.add(policy)

    from ..models import BookingDependency

    deps = [
        (booking_ids[1], booking_ids[0]),
        (booking_ids[2], booking_ids[0]),
        (booking_ids[3], booking_ids[1]),
    ]
    for dependent, depends_on in deps:
        db.add(BookingDependency(trip_id=trip.id, dependent_booking_id=dependent, depends_on_booking_id=depends_on, relation_type="AFTER"))
    db.commit()
    return {"trip_id": trip.id, "booking_ids": booking_ids}