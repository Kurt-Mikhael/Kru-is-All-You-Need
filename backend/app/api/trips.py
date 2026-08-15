from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Booking, Trip
from ..schemas import BookingCreate, BookingOut, TripCreate, TripDetail, TripOut

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.post("", response_model=TripOut)
def create_trip(payload: TripCreate, db: Session = Depends(get_db)):
    trip = Trip(**payload.model_dump())
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


@router.get("", response_model=list[TripOut])
def list_trips(db: Session = Depends(get_db)):
    return db.scalars(select(Trip).order_by(Trip.id)).all()


@router.put("/{trip_id}", response_model=TripOut)
def update_trip(trip_id: int, payload: TripCreate, db: Session = Depends(get_db)):
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(404, "trip not found")
    for key, value in payload.model_dump().items():
        setattr(trip, key, value)
    db.commit()
    db.refresh(trip)
    return trip


@router.get("/{trip_id}", response_model=TripDetail)
def get_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(404, "trip not found")
    return trip


@router.post("/{trip_id}/bookings", response_model=BookingOut)
def add_booking(trip_id: int, payload: BookingCreate, db: Session = Depends(get_db)):
    if not db.get(Trip, trip_id):
        raise HTTPException(404, "trip not found")
    booking = Booking(trip_id=trip_id, **payload.model_dump())
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/{trip_id}/bookings", response_model=list[BookingOut])
def list_bookings(trip_id: int, db: Session = Depends(get_db)):
    return db.scalars(select(Booking).where(Booking.trip_id == trip_id)).all()