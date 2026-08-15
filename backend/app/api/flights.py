from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..integrations.atlas import adapter
from ..schemas import AlternativeFlight

router = APIRouter(prefix="/api/flights", tags=["flights"])


@router.post("/search-alternatives", response_model=list[AlternativeFlight])
def search_alternatives(payload: dict, db: Session = Depends(get_db)):
    origin = payload.get("origin", "")
    destination = payload.get("destination", "")
    departure_date = payload.get("departure_date", "")
    passengers = int(payload.get("passengers", 1))
    if not origin or not destination or not departure_date:
        raise HTTPException(400, "origin, destination, departure_date required")
    return adapter.search_alternative_flights(origin, destination, departure_date, passengers)