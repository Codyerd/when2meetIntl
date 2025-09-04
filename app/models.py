from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from .database import Base

class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    default_timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    start_utc: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_utc: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    participants = relationship("Participant", back_populates="event", cascade="all, delete-orphan")
    availabilities = relationship("Availability", back_populates="event", cascade="all, delete-orphan")

class Participant(Base):
    __tablename__ = "participants"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    username: Mapped[str] = mapped_column(String(64))
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    color: Mapped[str] = mapped_column(String(16), default="#66ccff")

    event = relationship("Event", back_populates="participants")
    availabilities = relationship("Availability", back_populates="participant", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("event_id", "username", name="uq_event_username"),
    )

class Availability(Base):
    __tablename__ = "availabilities"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    participant_id: Mapped[int] = mapped_column(ForeignKey("participants.id", ondelete="CASCADE"), index=True)
    slot_start_utc: Mapped[DateTime] = mapped_column(DateTime(timezone=True), index=True)
    slot_end_utc: Mapped[DateTime] = mapped_column(DateTime(timezone=True), index=True)

    event = relationship("Event", back_populates="availabilities")
    participant = relationship("Participant", back_populates="availabilities")

    __table_args__ = (
        UniqueConstraint("event_id", "participant_id", "slot_start_utc", name="uq_participant_slot"),
    )
