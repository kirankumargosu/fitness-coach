"""ORM models.

Data shape:
  User (Kiran / Tony)
    -> WorkoutSession (one gym visit: a date/time + optional title/notes)
        -> SetEntry (one logged set: exercise + set number + reps + weight)

Exercise is a small reusable catalog (e.g. "Bench Press", "Squat") shared
across both users so names stay consistent and can be picked from a list
in the UI, while still allowing free-text entry of new exercises.
"""
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    sessions: Mapped[list["WorkoutSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)

    set_entries: Mapped[list["SetEntry"]] = relationship(back_populates="exercise")


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="sessions")
    sets: Mapped[list["SetEntry"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="SetEntry.id",
    )


class SetEntry(Base):
    """One logged 'set'. Two flavors, distinguished by which fields are
    populated:
      - strength (reps/weight): "3 x 8 @ 60kg"
      - cardio (duration/distance): "20 min, 4.2 km jog"
    A row must have at least one of (reps, duration_seconds) filled in —
    enforced at the API layer, not the DB, to keep the schema simple.
    """

    __tablename__ = "set_entries"
    __table_args__ = (
        UniqueConstraint(
            "session_id", "exercise_id", "set_number", name="uq_session_exercise_set"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("workout_sessions.id"), nullable=False
    )
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"), nullable=False)
    set_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Strength fields
    reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_unit: Mapped[str | None] = mapped_column(String(4), nullable=True)

    # Cardio fields
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    distance: Mapped[float | None] = mapped_column(Float, nullable=True)
    distance_unit: Mapped[str | None] = mapped_column(String(4), nullable=True)

    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    session: Mapped["WorkoutSession"] = relationship(back_populates="sets")
    exercise: Mapped["Exercise"] = relationship(back_populates="set_entries")
