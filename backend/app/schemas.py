from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ---------- User ----------
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


# ---------- Exercise ----------
class ExerciseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: str | None = None


class ExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    category: str | None = None


# ---------- SetEntry ----------
# Two flavors of set, distinguished by which fields are filled in:
#   strength: reps + weight (+ weight_unit)      — "3 x 8 @ 60kg"
#   cardio:   duration_seconds (+ distance)       — "20 min, 4.2 km jog"
# A set must provide at least one of (reps, duration_seconds); the rest of
# each flavor's fields are optional so you can log duration-only ("just
# time on the treadmill, didn't track distance") just as easily.
class SetEntryCreate(BaseModel):
    exercise_id: int | None = None
    exercise_name: str | None = None  # allows creating a new exercise inline
    set_number: int = Field(ge=1)

    # Strength
    reps: int | None = Field(default=None, ge=0)
    weight: float | None = Field(default=None, ge=0)
    weight_unit: Literal["kg", "lb"] | None = None

    # Cardio
    duration_seconds: int | None = Field(default=None, ge=0)
    distance: float | None = Field(default=None, ge=0)
    distance_unit: Literal["km", "mi"] | None = None

    notes: str | None = None

    @model_validator(mode="after")
    def require_a_measure(self) -> "SetEntryCreate":
        if self.reps is None and self.duration_seconds is None:
            raise ValueError(
                "Provide either reps (strength) or duration_seconds (cardio)."
            )
        # Default the unit fields when their value is present but unit isn't.
        if self.weight is not None and self.weight_unit is None:
            self.weight_unit = "kg"
        if self.distance is not None and self.distance_unit is None:
            self.distance_unit = "km"
        return self


class SetEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    exercise: ExerciseOut
    set_number: int
    reps: int | None = None
    weight: float | None = None
    weight_unit: str | None = None
    duration_seconds: int | None = None
    distance: float | None = None
    distance_unit: str | None = None
    notes: str | None = None


# ---------- WorkoutSession ----------
class WorkoutSessionCreate(BaseModel):
    user_id: int
    title: str | None = None
    date: datetime
    duration_minutes: int | None = None
    notes: str | None = None
    sets: list[SetEntryCreate] = []


class WorkoutSessionUpdate(BaseModel):
    title: str | None = None
    date: datetime | None = None
    duration_minutes: int | None = None
    notes: str | None = None


class WorkoutSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user: UserOut
    title: str | None = None
    date: datetime
    duration_minutes: int | None = None
    notes: str | None = None
    created_at: datetime
    sets: list[SetEntryOut] = []


class WorkoutSessionSummary(BaseModel):
    """Lighter-weight shape for list views."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    user: UserOut
    title: str | None = None
    date: datetime
    duration_minutes: int | None = None
    set_count: int = 0
    total_volume: float = 0
    