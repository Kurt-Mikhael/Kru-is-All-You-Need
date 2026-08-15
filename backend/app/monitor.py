import asyncio
import logging

from sqlalchemy import select

from .config import MONITOR_ENABLED, MONITOR_INTERVAL_MINUTES, MONITOR_TRIGGER_SCORE
from .database import SessionLocal
from .integrations import geopolitical, weather
from .models import AgentLogEntry, RiskEvent, Scenario, Trip

logger = logging.getLogger("monitor")

WEATHER_TYPES = {"SEVERE_WEATHER"}
GEOPOLITICAL_TYPES = {geopolitical.GEOPOLITICAL_EVENT_TYPE}


async def monitor_loop() -> None:
    if not MONITOR_ENABLED:
        logger.info("monitor disabled (MONITOR_ENABLED=false)")
        return
    while True:
        try:
            await asyncio.to_thread(run_cycle)
        except Exception as exc:
            logger.warning("monitor cycle failed: %s", exc)
        await asyncio.sleep(MONITOR_INTERVAL_MINUTES * 60)


def run_cycle() -> None:
    db = SessionLocal()
    try:
        new_events = _collect_events(db)
        _evaluate_and_analyze(db, new_events)
    finally:
        db.close()


def _collect_events(db) -> list[RiskEvent]:
    new_events = []
    for event_dict in _weather_events() + _geopolitical_events(db):
        if _event_exists(db, event_dict):
            continue
        event = RiskEvent(**event_dict)
        db.add(event)
        db.commit()
        db.refresh(event)
        new_events.append(event)
    return new_events


def _weather_events() -> list[dict]:
    return [a for a in weather.get_active_weather_alerts() if a["event_type"] in WEATHER_TYPES]


def _geopolitical_events(db) -> list[dict]:
    trips = db.scalars(select(Trip)).all()
    locations = sorted({t.destination for t in trips})
    return geopolitical.get_geopolitical_risks(locations)


def _event_exists(db, event_dict: dict) -> bool:
    return (
        db.scalars(
            select(RiskEvent).where(
                RiskEvent.location == event_dict["location"],
                RiskEvent.event_type == event_dict["event_type"],
                RiskEvent.status == "ACTIVE",
            )
        ).first()
        is not None
    )


def _evaluate_and_analyze(db, new_events: list[RiskEvent]) -> None:
    from .agents.continuity_agent import run_analysis
    from .services import risk_engine

    trips = db.scalars(select(Trip)).all()
    if not trips:
        return
    active_events = db.scalars(select(RiskEvent).where(RiskEvent.status == "ACTIVE")).all()
    for event in active_events:
        for trip in trips:
            assessment = risk_engine.evaluate_trip(db, trip.id, event.id)
            if trip.intervention_score < MONITOR_TRIGGER_SCORE:
                continue
            if _already_analyzed(db, trip.id, event.id):
                continue
            try:
                run_analysis(db, trip, event, assessment)
                db.add(
                    AgentLogEntry(
                        trip_id=trip.id,
                        step="auto_trigger",
                        status="OK",
                        summary=f"Automated monitoring triggered agent for {trip.name}",
                        detail=f"score={trip.intervention_score}",
                    )
                )
                db.commit()
            except Exception as exc:
                logger.warning("auto analyze failed for trip %s: %s", trip.id, exc)


def _already_analyzed(db, trip_id: int, event_id: int) -> bool:
    return (
        db.scalars(select(Scenario).where(Scenario.trip_id == trip_id, Scenario.risk_event_id == event_id)).first()
        is not None
    )