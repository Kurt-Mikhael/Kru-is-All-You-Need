from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Booking
from ..schemas import FinancialExposureOut


def get_financial_exposure(db: Session, trip_id: int, affected_ids: list[int] | None = None) -> FinancialExposureOut:
    bookings = db.scalars(select(Booking).where(Booking.trip_id == trip_id)).all()
    if affected_ids is not None:
        bookings = [b for b in bookings if b.id in affected_ids]

    total = sum(b.cost for b in bookings)
    refundable = sum(b.cost * (b.refundable_pct / 100.0) for b in bookings)
    non_refundable = total - refundable
    becoming_soon = sum(b.cost for b in bookings if b.change_deadline and 0 < _hours_until(b) <= 24)
    return FinancialExposureOut(
        total_value=round(total, 2),
        refundable_value=round(refundable, 2),
        non_refundable_exposure=round(non_refundable, 2),
        becoming_non_refundable_soon=round(becoming_soon, 2),
        potential_recovery_value=round(refundable, 2),
    )


def _hours_until(booking: Booking) -> float:
    if not booking.change_deadline:
        return 9999.0
    try:
        from datetime import datetime

        deadline = datetime.strptime(booking.change_deadline, "%Y%m%dT%H%M")
        return (deadline - datetime.utcnow()).total_seconds() / 3600
    except ValueError:
        return 9999.0