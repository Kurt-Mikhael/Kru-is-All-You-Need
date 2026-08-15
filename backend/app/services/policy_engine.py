from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Booking, Policy


def get_booking_policy(db: Session, booking_id: int) -> dict:
    policy = db.scalar(select(Policy).where(Policy.booking_id == booking_id))
    if policy:
        return policy.rules
    return {}


def normalize_policy(rules: dict) -> dict:
    free_cancel_until = rules.get("free_cancel_until", "")
    refund_pct = rules.get("refund_percentage", 0.0)
    change_allowed = rules.get("change_allowed", False)
    return {
        "free_cancel_until": free_cancel_until,
        "refund_percentage": refund_pct,
        "change_allowed": change_allowed,
    }


def get_deadline_proximity(booking: Booking, now: str) -> float:
    if not booking.change_deadline:
        return 1.0
    try:
        from datetime import datetime

        deadline = datetime.strptime(booking.change_deadline, "%Y%m%dT%H%M")
        now_dt = datetime.strptime(now, "%Y%m%dT%H%M")
        hours = (deadline - now_dt).total_seconds() / 3600
    except (ValueError, TypeError):
        return 1.0
    if hours <= 0:
        return 1.0
    return max(0.0, min(1.0, 1.0 - hours / 72.0))