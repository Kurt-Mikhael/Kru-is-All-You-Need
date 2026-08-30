import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models import Booking, RiskEvent, Scenario, Trip


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    with session_factory() as db:
        trip = Trip(
            name="Continuity test",
            origin="CGK",
            destination="NRT",
            start_date="2026-09-01",
            end_date="2026-09-03",
        )
        db.add(trip)
        db.flush()
        flight = Booking(
            trip_id=trip.id,
            booking_type="flight",
            provider="Atlas",
            title="Outbound flight",
            location="NRT",
            start_time="20260901T0900",
            end_time="20260901T2100",
            cost=500,
            refundable_pct=80,
        )
        hotel = Booking(
            trip_id=trip.id,
            booking_type="hotel",
            provider="MockHotel",
            title="Tokyo hotel",
            location="Tokyo",
            start_time="20260901T2200",
            end_time="20260903T1000",
            cost=300,
            refundable_pct=50,
        )
        db.add_all([flight, hotel])
        db.flush()
        event = RiskEvent(
            event_type="WEATHER",
            location="NRT",
            severity=0.8,
            confidence=0.9,
            start_time="20260901T0900",
            expected_duration="12h",
            source="test",
        )
        db.add(event)
        db.flush()
        db.commit()
        trip_id = trip.id
        flight_id = flight.id
        hotel_id = hotel.id
        event_id = event.id

    with TestClient(app) as test_client:
        yield test_client, session_factory, trip_id, flight_id, hotel_id, event_id

    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)


def _create_scenario(session_factory, trip_id, event_id, actions, status="APPROVED"):
    with session_factory() as db:
        scenario = Scenario(
            trip_id=trip_id,
            risk_event_id=event_id,
            plan_code="A",
            title="Test recovery",
            description="A test recovery plan",
            actions=actions,
            scores={},
            overall_score=90,
            status=status,
        )
        db.add(scenario)
        db.commit()
        return scenario.id


def test_execute_rejects_unapproved_scenario(client):
    test_client, session_factory, trip_id, flight_id, _, event_id = client
    scenario_id = _create_scenario(
        session_factory,
        trip_id,
        event_id,
        [{"booking_id": flight_id, "action": "KEEP"}],
        status="DRAFT",
    )

    response = test_client.post(f"/api/continuity/scenarios/{scenario_id}/execute")

    assert response.status_code == 400
    assert response.json() == {"detail": "scenario must be approved first"}


def test_execute_rejects_duplicate_execution_with_conflict(client):
    test_client, session_factory, trip_id, flight_id, _, event_id = client
    scenario_id = _create_scenario(
        session_factory,
        trip_id,
        event_id,
        [{"booking_id": flight_id, "action": "KEEP"}],
    )

    first = test_client.post(f"/api/continuity/scenarios/{scenario_id}/execute")
    second = test_client.post(f"/api/continuity/scenarios/{scenario_id}/execute")

    assert first.status_code == 200
    assert second.status_code == 409
    assert second.json() == {"detail": "scenario already executed"}


def test_execute_returns_updated_state_and_action_provenance(client, monkeypatch):
    test_client, session_factory, trip_id, flight_id, hotel_id, event_id = client
    scenario_id = _create_scenario(
        session_factory,
        trip_id,
        event_id,
        [
            {
                "booking_id": flight_id,
                "action": "REBOOK",
                "new_time": "20260901T1200",
                "flight_number": "MU123",
                "flight_price": 650,
            },
            {
                "booking_id": hotel_id,
                "action": "RESCHEDULE",
                "new_time": "20260902T1000",
            },
        ],
    )

    monkeypatch.setattr(
        "backend.app.agents.continuity_agent.adapter.book_alternative_flight",
        lambda alternative, passengers=1: {
            "provider": "MOCK",
            "simulated": True,
            "flight": alternative.flight_number,
            "price": alternative.price,
        },
    )

    response = test_client.post(f"/api/continuity/scenarios/{scenario_id}/execute")

    assert response.status_code == 200
    payload = response.json()
    assert payload["scenario_id"] == scenario_id
    assert {"results", "trip", "graph", "financial_exposure", "risk"} <= payload.keys()
    results = {result["booking_id"]: result for result in payload["results"]}
    assert results[flight_id]["action"] == "REBOOK"
    assert results[flight_id]["new_time"] == "20260901T1200"
    assert results[flight_id]["simulated"] is True
    assert results[flight_id]["provenance"] == "SIMULATED"
    assert results[hotel_id]["action"] == "RESCHEDULE"
    assert results[hotel_id]["provenance"] == "SIMULATED"

    bookings = {booking["id"]: booking for booking in payload["trip"]["bookings"]}
    assert bookings[flight_id]["start_time"] == "20260901T1200"
    assert bookings[flight_id]["status"] == "CHANGED"
    assert bookings[hotel_id]["start_time"] == "20260902T1000"
    assert bookings[hotel_id]["status"] == "CHANGED"

    nodes = {node["id"]: node for node in payload["graph"]["nodes"]}
    assert nodes[flight_id]["start_time"] == "20260901T1200"
    assert nodes[hotel_id]["start_time"] == "20260902T1000"
    assert payload["financial_exposure"]["total_value"] == 800.0
    assert payload["risk"]["trip_id"] == trip_id
    assert payload["risk"]["risk_event_id"] == event_id

    with session_factory() as db:
        scenario = db.get(Scenario, scenario_id)
        assert scenario.status == "EXECUTED"
        assert db.get(Booking, flight_id).start_time == "20260901T1200"
        assert db.get(Booking, hotel_id).start_time == "20260902T1000"
def test_cancel_action_persists_cancelled_state(client):
    test_client, session_factory, trip_id, _, hotel_id, event_id = client
    scenario_id = _create_scenario(
        session_factory,
        trip_id,
        event_id,
        [{"booking_id": hotel_id, "action": "CANCEL"}],
    )

    response = test_client.post(f"/api/continuity/scenarios/{scenario_id}/execute")

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["action"] == "CANCEL"
    assert result["status"] == "CANCELLED"
    assert result["new_time"] == "20260901T2200"

    with session_factory() as db:
        assert db.get(Booking, hotel_id).status == "CANCELLED"


def test_empty_rebook_time_preserves_existing_time(client, monkeypatch):
    test_client, session_factory, trip_id, flight_id, _, event_id = client
    scenario_id = _create_scenario(
        session_factory,
        trip_id,
        event_id,
        [
            {
                "booking_id": flight_id,
                "action": "REBOOK",
                "new_time": "",
                "flight_number": "MU123",
            }
        ],
    )
    monkeypatch.setattr(
        "backend.app.agents.continuity_agent.adapter.book_alternative_flight",
        lambda alternative, passengers=1: {"provider": "MOCK", "simulated": True},
    )

    response = test_client.post(f"/api/continuity/scenarios/{scenario_id}/execute")

    assert response.status_code == 200
    assert response.json()["results"][0]["new_time"] == "20260901T0900"
    with session_factory() as db:
        assert db.get(Booking, flight_id).start_time == "20260901T0900"


def test_execution_response_preserves_provider_result_fields(client, monkeypatch):
    test_client, session_factory, trip_id, flight_id, _, event_id = client
    scenario_id = _create_scenario(
        session_factory,
        trip_id,
        event_id,
        [
            {
                "booking_id": flight_id,
                "action": "REBOOK",
                "new_time": "20260901T1200",
                "flight_number": "MU123",
            }
        ],
    )
    provider_result = {
        "provider": "ATLAS",
        "order_no": "ORD-1",
        "pnr": "PNR-1",
        "flight": "MU123",
        "price": 650,
        "total": 660,
        "external_ref": "EXT-1",
        "ticketed": True,
        "confirmation_code": "CONF-1",
    }
    monkeypatch.setattr(
        "backend.app.agents.continuity_agent.adapter.book_alternative_flight",
        lambda alternative, passengers=1: provider_result,
    )

    response = test_client.post(f"/api/continuity/scenarios/{scenario_id}/execute")

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert {key: result[key] for key in provider_result} == provider_result
    assert result["external_ref"] == "EXT-1"
    with session_factory() as db:
        assert db.get(Booking, flight_id).external_ref == "ORD-1"


def test_keep_result_is_safe_for_static_consumer(client):
    test_client, session_factory, trip_id, flight_id, _, event_id = client
    scenario_id = _create_scenario(
        session_factory,
        trip_id,
        event_id,
        [{"booking_id": flight_id, "action": "KEEP"}],
    )

    response = test_client.post(f"/api/continuity/scenarios/{scenario_id}/execute")

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["action"] == "KEEP"
    assert result["provider"] == ""
    assert result["simulated"] is False
    assert result["provenance"] == "UNCHANGED"
