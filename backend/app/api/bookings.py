from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Booking, BookingDependency, Policy
from ..schemas import DependencyCreate, GraphEdge, GraphNode, PolicyOut, TripGraphOut
from ..services import policy_engine, trip_graph

router = APIRouter(prefix="/api", tags=["bookings"])


@router.patch("/bookings/{booking_id}")
def update_booking(booking_id: int, payload: dict, db: Session = Depends(get_db)):
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "booking not found")
    for key, value in payload.items():
        if hasattr(booking, key):
            setattr(booking, key, value)
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/bookings/{booking_id}/policy", response_model=PolicyOut)
def get_policy(booking_id: int, db: Session = Depends(get_db)):
    if not db.get(Booking, booking_id):
        raise HTTPException(404, "booking not found")
    rules = policy_engine.get_booking_policy(db, booking_id)
    return PolicyOut(booking_id=booking_id, rules=rules, normalized=policy_engine.normalize_policy(rules))


@router.get("/trips/{trip_id}/graph", response_model=TripGraphOut)
def get_graph(trip_id: int, db: Session = Depends(get_db)):
    return trip_graph.get_trip_graph(db, trip_id)


@router.post("/trips/{trip_id}/dependencies")
def add_dependency(trip_id: int, payload: DependencyCreate, db: Session = Depends(get_db)):
    dep = BookingDependency(trip_id=trip_id, **payload.model_dump())
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep