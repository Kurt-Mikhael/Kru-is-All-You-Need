from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    origin: Mapped[str] = mapped_column(String(10))
    destination: Mapped[str] = mapped_column(String(10))
    start_date: Mapped[str] = mapped_column(String(10))
    end_date: Mapped[str] = mapped_column(String(10))
    risk_state: Mapped[str] = mapped_column(String(20), default="MONITOR")
    intervention_score: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    bookings: Mapped[list["Booking"]] = relationship(back_populates="trip", cascade="all, delete-orphan")


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"))
    booking_type: Mapped[str] = mapped_column(String(20))
    provider: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(200))
    location: Mapped[str] = mapped_column(String(100))
    start_time: Mapped[str] = mapped_column(String(16))
    end_time: Mapped[str] = mapped_column(String(16))
    cost: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    cancel_deadline: Mapped[str] = mapped_column(String(16), default="")
    change_deadline: Mapped[str] = mapped_column(String(16), default="")
    refundable_pct: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="CONFIRMED")
    external_ref: Mapped[str] = mapped_column(String(100), default="")

    trip: Mapped[Trip] = relationship(back_populates="bookings")
    policy: Mapped["Policy"] = relationship(back_populates="booking", uselist=False, cascade="all, delete-orphan")


class BookingDependency(Base):
    __tablename__ = "booking_dependencies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"))
    dependent_booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"))
    depends_on_booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"))
    relation_type: Mapped[str] = mapped_column(String(30), default="AFTER")


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"))
    rules: Mapped[dict] = mapped_column(JSON, default=dict)

    booking: Mapped[Booking] = relationship(back_populates="policy")


class RiskEvent(Base):
    __tablename__ = "risk_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(50))
    location: Mapped[str] = mapped_column(String(100))
    severity: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float)
    start_time: Mapped[str] = mapped_column(String(16))
    expected_duration: Mapped[str] = mapped_column(String(50))
    source: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"))
    risk_event_id: Mapped[int] = mapped_column(ForeignKey("risk_events.id"))
    exposure_score: Mapped[float] = mapped_column(Float)
    affected_booking_ids: Mapped[list] = mapped_column(JSON, default=list)
    drivers: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"))
    risk_event_id: Mapped[int] = mapped_column(ForeignKey("risk_events.id"), default=0)
    plan_code: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(String(1000), default="")
    actions: Mapped[list] = mapped_column(JSON, default=list)
    scores: Mapped[dict] = mapped_column(JSON, default=dict)
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)
    additional_cost: Mapped[float] = mapped_column(Float, default=0.0)
    value_preserved_pct: Mapped[float] = mapped_column(Float, default=100.0)
    residual_risk: Mapped[str] = mapped_column(String(20), default="HIGH")
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    rationale: Mapped[str] = mapped_column(String(2000), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AgentLogEntry(Base):
    __tablename__ = "agent_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"))
    scenario_id: Mapped[int] = mapped_column(Integer, default=0)
    step: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="OK")
    summary: Mapped[str] = mapped_column(String(300))
    detail: Mapped[str] = mapped_column(String(1000), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)