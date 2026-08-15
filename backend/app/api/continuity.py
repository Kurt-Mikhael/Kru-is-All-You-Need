from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..agents.continuity_agent import execute_scenario, run_analysis
from ..database import get_db
from ..models import AgentLogEntry, Booking, RiskAssessment, RiskEvent, Scenario, Trip
from ..schemas import AgentLogOut, ScenarioOut

router = APIRouter(prefix="/api/continuity", tags=["continuity"])


@router.post("/analyze/{trip_id}", response_model=list[ScenarioOut])
def analyze(trip_id: int, risk_event_id: int = 0, db: Session = Depends(get_db)):
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(404, "trip not found")
    if not risk_event_id:
        assessment = db.scalars(
            select(RiskAssessment).where(RiskAssessment.trip_id == trip_id).order_by(RiskAssessment.id.desc())
        ).first()
        if not assessment:
            raise HTTPException(400, "no risk assessment yet; evaluate a risk event first")
    else:
        event = db.get(RiskEvent, risk_event_id)
        if not event:
            raise HTTPException(404, "risk event not found")
        assessment = db.scalars(
            select(RiskAssessment)
            .where(RiskAssessment.trip_id == trip_id, RiskAssessment.risk_event_id == risk_event_id)
            .order_by(RiskAssessment.id.desc())
        ).first()
        if not assessment:
            from ..services import risk_engine

            assessment = risk_engine.evaluate_trip(db, trip_id, risk_event_id)
    event = db.get(RiskEvent, assessment.risk_event_id)
    scenarios = run_analysis(db, trip, event, assessment)
    return scenarios


@router.post("/scenarios/{trip_id}", response_model=list[ScenarioOut])
def generate(trip_id: int, risk_event_id: int = 0, db: Session = Depends(get_db)):
    return analyze(trip_id, risk_event_id, db)


@router.get("/scenarios/{trip_id}", response_model=list[ScenarioOut])
def list_scenarios(trip_id: int, db: Session = Depends(get_db)):
    return db.scalars(select(Scenario).where(Scenario.trip_id == trip_id).order_by(Scenario.overall_score.desc())).all()


@router.post("/scenarios/{scenario_id}/approve", response_model=ScenarioOut)
def approve(scenario_id: int, db: Session = Depends(get_db)):
    scenario = db.get(Scenario, scenario_id)
    if not scenario:
        raise HTTPException(404, "scenario not found")
    scenario.status = "APPROVED"
    db.commit()
    db.refresh(scenario)
    return scenario


@router.post("/scenarios/{scenario_id}/execute")
def execute(scenario_id: int, db: Session = Depends(get_db)):
    scenario = db.get(Scenario, scenario_id)
    if not scenario:
        raise HTTPException(404, "scenario not found")
    if scenario.status != "APPROVED":
        raise HTTPException(400, "scenario must be approved first")
    results = execute_scenario(db, scenario)
    return {"scenario_id": scenario_id, "results": results}


@router.get("/trips/{trip_id}/activities", response_model=list[AgentLogOut])
def activities(trip_id: int, db: Session = Depends(get_db)):
    return db.scalars(select(AgentLogEntry).where(AgentLogEntry.trip_id == trip_id).order_by(AgentLogEntry.id)).all()