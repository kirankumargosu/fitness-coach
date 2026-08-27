"""ORM models.

Data shape:
  User (any registered lifter)
    -> WorkoutSession (one gym visit: a date/time + optional title/notes)
        -> SetEntry (one logged set: exercise + set number + reps + weight)

Exercise is a small reusable catalog (e.g. "Bench Press", "Squat") shared
across all users so names stay consistent and can be picked from a list
in the UI, while still allowing free-text entry of new exercises.
"""
from datetime import date as date_
from datetime import datetime

from sqlalchemy import (
    Date,
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

    # Auth. password_hash/salt are NULL until the person completes the
    # one-time "register" step that claims their (pre-seeded) account.
    password_hash: Mapped[str | None] = mapped_column(String(200), nullable=True)
    salt: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # "member" (default) can only create/edit/delete their own data.
    # "admin" can do so for everyone. Set via the ADMIN_USER env var at
    # startup (see main.py) — Kiran, by default.
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="member")

    # Name components, used for avatar initials. Nullable — existing
    # accounts (and the login/register name itself) don't require these.
    first_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Personal details. Only ever exposed via the dedicated /profile
    # endpoint (self or admin) — never included in the general user list,
    # unlike first_name/last_name above which are just avatar material.
    date_of_birth: Mapped[date_ | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(30), nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    height_unit: Mapped[str | None] = mapped_column(String(4), nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_unit: Mapped[str | None] = mapped_column(String(4), nullable=True)
    goal: Mapped[str | None] = mapped_column(Text, nullable=True)

    sessions: Mapped[list["WorkoutSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def has_password(self) -> bool:
        """Whether this account has completed registration yet."""
        return self.password_hash is not None


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


class AuthSession(Base):
    """A logged-in browser session — deliberately named AuthSession (not
    'Session') to avoid confusion with WorkoutSession. The token itself
    (a long random string) is what's stored in the browser's cookie.
    """

    __tablename__ = "auth_sessions"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)