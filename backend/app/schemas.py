from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class BookingBase(BaseModel):
    booking_type: str
    provider: str
    title: str
    location: str
    start_time: str
    end_time: str
    cost: float
    currency: str = "USD"
    cancel_deadline: str = ""
    change_deadline: str = ""
    refundable_pct: float = 0.0
    external_ref: str = ""


class BookingCreate(BookingBase):
    pass


class BookingOut(BookingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str


class TripCreate(BaseModel):
    name: str
    origin: str
    destination: str
    start_date: str
    end_date: str


class TripOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    origin: str
    destination: str
    start_date: str
    end_date: str
    risk_state: str
    intervention_score: float
    created_at: datetime


class TripDetail(TripOut):
    bookings: list[BookingOut] = []


class DependencyCreate(BaseModel):
    dependent_booking_id: int
    depends_on_booking_id: int
    relation_type: str = "AFTER"


class RiskEventCreate(BaseModel):
    event_type: str
    location: str
    severity: float
    confidence: float
    start_time: str
    expected_duration: str = ""
    source: str = "demo"


class RiskEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: str
    location: str
    severity: float
    confidence: float
    start_time: str
    expected_duration: str
    source: str
    status: str


class RiskEvaluationOut(BaseModel):
    trip_id: int
    risk_event_id: int
    exposure_score: float
    risk_state: str
    affected_booking_ids: list[int]
    drivers: dict[str, Any]


class AlternativeFlight(BaseModel):
    flight_number: str
    carrier: str
    origin: str
    destination: str
    dep_time: str
    arr_time: str
    price: float
    currency: str
    segments: int
    stops: int
    provider_ref: str = ""


class ScenarioAction(BaseModel):
    booking_id: int
    booking_type: str
    action: str
    new_time: str = ""
    detail: str = ""


class ScenarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    plan_code: str
    title: str
    description: str
    actions: list[Any]
    scores: dict[str, Any]
    overall_score: float
    additional_cost: float
    value_preserved_pct: float
    residual_risk: str
    status: str
    rationale: str


class AgentLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trip_id: int
    step: str
    status: str
    summary: str
    detail: str
    created_at: datetime


class FinancialExposureOut(BaseModel):
    total_value: float
    refundable_value: float
    non_refundable_exposure: float
    becoming_non_refundable_soon: float
    potential_recovery_value: float


class GraphNode(BaseModel):
    id: int
    title: str
    booking_type: str
    start_time: str
    status: str


class GraphEdge(BaseModel):
    source: int
    target: int
    relation_type: str


class TripGraphOut(BaseModel):
    trip_id: int
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class PolicyOut(BaseModel):
    booking_id: int
    rules: dict[str, Any]
    normalized: dict[str, Any]
