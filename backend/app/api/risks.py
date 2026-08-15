from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..integrations import weather
from ..models import Booking, RiskAssessment, RiskEvent, Trip
from ..schemas import RiskEvaluationOut, RiskEventCreate, RiskEventOut
from ..services import risk_engine

router = APIRouter(prefix="/api/risk", tags=["risk"])

DEMO_EVENTS = {
    "TOKYO_SEVERE_WEATHER": dict(event_type="SEVERE_WEATHER", location="Tokyo", severity=0.82, confidence=0.91, start_time="20260920T060000", expected_duration="72h", source="demo"),
    "MIDDLE_EAST_AIRSPACE_RESTRICTION": dict(event_type="AIRSPACE_RESTRICTION", location="Middle East", severity=0.75, confidence=0.70, start_time="20260919T000000", expected_duration="96h", source="demo"),
    "AIRPORT_STRIKE": dict(event_type="AIRPORT_STRIKE", location="Tokyo", severity=0.65, confidence=0.85, start_time="20260921T000000", expected_duration="24h", source="demo"),
    "REGULATORY_CHANGE": dict(event_type="REGULATORY_CHANGE", location="Tokyo", severity=0.55, confidence=0.80, start_time="20260918T000000", expected_duration="0h", source="demo"),
    "AIRLINE_CANCELLATION": dict(event_type="OPERATIONAL_DISRUPTION", location="Tokyo", severity=1.0, confidence=1.0, start_time="20260918T120000", expected_duration="48h", source="airline"),
}


@router.get("/events", response_model=list[RiskEventOut])
def list_events(db: Session = Depends(get_db)):
    return db.scalars(select(RiskEvent).order_by(RiskEvent.id.desc())).all()


@router.post("/events", response_model=RiskEventOut)
def create_event(payload: RiskEventCreate, db: Session = Depends(get_db)):
    event = RiskEvent(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.post("/events/demo", response_model=RiskEventOut)
def inject_demo(scenario: str, db: Session = Depends(get_db)):
    template = DEMO_EVENTS.get(scenario.upper())
    if not template:
        raise HTTPException(404, f"unknown demo scenario: {scenario}")
    event = RiskEvent(**template)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.post("/events/operational-disruption")
def operational_disruption(flight_booking_id: int, db: Session = Depends(get_db)):
    event = RiskEvent(
        event_type="OPERATIONAL_DISRUPTION",
        location="",
        severity=1.0,
        confidence=1.0,
        start_time="now",
        expected_duration="48h",
        source="airline",
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    from ..agents.continuity_agent import run_analysis
    from ..monitor import _already_analyzed

    results = []
    trips = db.scalars(select(Trip)).all()
    for trip in trips:
        if _already_analyzed(db, trip.id, event.id):
            continue
        booking = db.get(Booking, flight_booking_id)
        if not booking or booking.trip_id != trip.id:
            continue
        assessment = risk_engine.evaluate_trip(db, trip.id, event.id)
        run_analysis(db, trip, event, assessment)
        results.append({"trip_id": trip.id, "analyzed": True})
    return {"event": event, "recovery": results}


@router.post("/evaluate/{trip_id}", response_model=RiskEvaluationOut)
def evaluate(trip_id: int, risk_event_id: int, db: Session = Depends(get_db)):
    if not db.get(Trip, trip_id):
        raise HTTPException(404, "trip not found")
    if not db.get(RiskEvent, risk_event_id):
        raise HTTPException(404, "risk event not found")
    assessment = risk_engine.evaluate_trip(db, trip_id, risk_event_id)
    trip = db.get(Trip, trip_id)
    return RiskEvaluationOut(
        trip_id=trip_id,
        risk_event_id=risk_event_id,
        exposure_score=assessment.exposure_score,
        risk_state=trip.risk_state,
        affected_booking_ids=assessment.affected_booking_ids,
        drivers=assessment.drivers,
    )


@router.get("/trips/{trip_id}/risk")
def trip_risk(trip_id: int, db: Session = Depends(get_db)):
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(404, "trip not found")
    assessments = db.scalars(
        select(RiskAssessment).where(RiskAssessment.trip_id == trip_id).order_by(RiskAssessment.id.desc())
    ).all()
    latest = assessments[0] if assessments else None
    return {
        "trip_id": trip_id,
        "risk_state": trip.risk_state,
        "intervention_score": trip.intervention_score,
        "latest_assessment": latest,
    }


@router.post("/check-weather")
def check_weather(db: Session = Depends(get_db)):
    alerts = weather.get_active_weather_alerts()
    created = []
    for a in alerts:
        event = RiskEvent(**a)
        db.add(event)
        created.append(event)
    db.commit()
    return created