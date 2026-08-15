from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Booking, BookingDependency
from ..schemas import GraphEdge, GraphNode, TripGraphOut


def get_trip_graph(db: Session, trip_id: int) -> TripGraphOut:
    bookings = db.scalars(select(Booking).where(Booking.trip_id == trip_id)).all()
    deps = db.scalars(select(BookingDependency).where(BookingDependency.trip_id == trip_id)).all()

    nodes = [
        GraphNode(
            id=b.id,
            title=b.title,
            booking_type=b.booking_type,
            start_time=b.start_time,
            status=b.status,
        )
        for b in bookings
    ]
    edges = [
        GraphEdge(source=d.depends_on_booking_id, target=d.dependent_booking_id, relation_type=d.relation_type)
        for d in deps
    ]
    return TripGraphOut(trip_id=trip_id, nodes=nodes, edges=edges)


def get_affected_bookings(db: Session, trip_id: int, booking_ids: list[int]) -> list[int]:
    affected = set(booking_ids)
    while True:
        deps = db.scalars(
            select(BookingDependency).where(
                BookingDependency.trip_id == trip_id,
                BookingDependency.depends_on_booking_id.in_(affected),
            )
        ).all()
        new_ids = {d.dependent_booking_id for d in deps} - affected
        if not new_ids:
            break
        affected |= new_ids
    return sorted(affected)