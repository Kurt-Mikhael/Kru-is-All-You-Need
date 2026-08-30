import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models import Booking, Trip


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
        db.add_all(
            [
                Booking(
                    trip_id=trip.id,
                    booking_type="FLIGHT",
                    provider="Air Test",
                    title="Outbound",
                    location="JFK",
                    start_time="20260901T0900",
                    end_time="20260901T2100",
                    cost=500,
                    refundable_pct=80,
                ),
                Booking(
                    trip_id=trip.id,
                    booking_type="HOTEL",
                    provider="Test Hotels",
                    title="Stay",
                    location="London",
                    start_time="20260901T2200",
                    end_time="20260903T1000",
                    cost=300,
                    refundable_pct=50,
                ),
            ]
        )
        db.commit()
        trip_id = trip.id

    with TestClient(app) as test_client:
        yield test_client, trip_id

    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)


def test_exposure_uses_all_trip_bookings(client):
    test_client, trip_id = client

    response = test_client.get(f"/api/trips/{trip_id}/exposure")

    assert response.status_code == 200
    assert response.json() == {
        "total_value": 800.0,
        "refundable_value": 550.0,
        "non_refundable_exposure": 250.0,
        "becoming_non_refundable_soon": 0.0,
        "potential_recovery_value": 550.0,
    }


def test_exposure_returns_not_found_for_missing_trip(client):
    test_client, _ = client

    response = test_client.get("/api/trips/999/exposure")

    assert response.status_code == 404
    assert response.json() == {"detail": "trip not found"}
