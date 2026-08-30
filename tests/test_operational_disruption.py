import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models import Booking, BookingDependency, RiskAssessment, RiskEvent, Trip


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        with TestingSessionLocal() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestingSessionLocal() as db:
        trip = Trip(
            name="Test trip",
            origin="JFK",
            destination="LHR",
            start_date="2026-09-01",
            end_date="2026-09-03",
        )
        db.add(trip)
        db.flush()
        flight = Booking(
            trip_id=trip.id,
            booking_type="FLIGHT",
            provider="Air Test",
            title="Outbound",
            location="JFK",
            start_time="20260901T0900",
            end_time="20260901T2100",
            cost=500,
        )
        hotel = Booking(
            trip_id=trip.id,
            booking_type="HOTEL",
            provider="Test Hotels",
            title="Stay",
            location="London",
            start_time="20260901T2200",
            end_time="20260903T1000",
            cost=300,
        )
        unrelated = Booking(
            trip_id=trip.id,
            booking_type="ACTIVITY",
            provider="Test Tours",
            title="Museum",
            location="London",
            start_time="20260902T1000",
            end_time="20260902T1200",
            cost=100,
        )
        db.add_all([flight, hotel, unrelated])
        db.flush()
        db.add(
            BookingDependency(
                trip_id=trip.id,
                dependent_booking_id=hotel.id,
                depends_on_booking_id=flight.id,
            )
        )
        db.commit()
        trip_id = trip.id
        flight_id = flight.id
        hotel_id = hotel.id
        unrelated_id = unrelated.id

    with TestClient(app) as test_client:
        yield test_client, TestingSessionLocal, trip_id, flight_id, hotel_id, unrelated_id

    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)


def test_operational_disruption_targets_flight_dependency_cascade(client, monkeypatch):
    test_client, session_factory, trip_id, flight_id, hotel_id, unrelated_id = client
    monkeypatch.setattr(
        "backend.app.agents.continuity_agent.run_analysis",
        lambda db, trip, event, assessment: [],
    )

    response = test_client.post(
        f"/api/risk/events/operational-disruption?flight_booking_id={flight_id}"
    )

    assert response.status_code == 200
    body = response.json()
    assert body["event"]["event_type"] == "OPERATIONAL_DISRUPTION"
    assert body["event"]["location"] == "JFK"
    assert body["event"]["source"] == "airline_reactive"
    assert body["event"]["status"] == "REACTIVE"
    assert body["recovery"] == [{"trip_id": trip_id, "analyzed": True}]

    with session_factory() as db:
        assessment = db.scalar(select(RiskAssessment).where(RiskAssessment.trip_id == trip_id))
        assert assessment.affected_booking_ids == [flight_id, hotel_id]
        assert unrelated_id not in assessment.affected_booking_ids

def test_ordinary_evaluation_uses_location_overlap(client):
    test_client, session_factory, trip_id, flight_id, hotel_id, unrelated_id = client

    with session_factory() as db:
        event = RiskEvent(
            event_type="AIRPORT_STRIKE",
            location="JFK",
            severity=0.5,
            confidence=0.8,
            start_time="20260901T060000",
            expected_duration="24h",
            source="demo",
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        risk_event_id = event.id

    response = test_client.post(
        f"/api/risk/evaluate/{trip_id}?risk_event_id={risk_event_id}"
    )

    assert response.status_code == 200
    assert response.json()["affected_booking_ids"] == [flight_id]

def test_operational_disruption_rejects_invalid_booking_input(client):
    test_client, session_factory, trip_id, flight_id, hotel_id, unrelated_id = client

    missing = test_client.post(
        "/api/risk/events/operational-disruption?flight_booking_id=999"
    )
    assert missing.status_code == 404
    assert missing.json() == {"detail": "flight booking not found"}

    with session_factory() as db:
        db.add(
            Booking(
                trip_id=trip_id,
                booking_type="HOTEL",
                provider="Other",
                title="Invalid",
                location="JFK",
                start_time="20260901T0900",
                end_time="20260901T1000",
                cost=10,
            )
        )
        db.commit()
        invalid_id = db.scalar(select(Booking.id).order_by(Booking.id.desc()))

    invalid = test_client.post(
        f"/api/risk/events/operational-disruption?flight_booking_id={invalid_id}"
    )
    assert invalid.status_code == 400
    assert invalid.json() == {"detail": "booking must be a flight booking"}

    with session_factory() as db:
        db.add(
            Booking(
                trip_id=999,
                booking_type="FLIGHT",
                provider="Other",
                title="Orphan",
                location="JFK",
                start_time="20260901T0900",
                end_time="20260901T1000",
                cost=10,
            )
        )
        db.commit()
        orphan_id = db.scalar(select(Booking.id).order_by(Booking.id.desc()))

    orphan = test_client.post(
        f"/api/risk/events/operational-disruption?flight_booking_id={orphan_id}"
    )
    assert orphan.status_code == 400
    assert orphan.json() == {"detail": "flight booking must belong to a trip"}

    with session_factory() as db:
        assert db.scalar(select(RiskEvent.id)) is None
