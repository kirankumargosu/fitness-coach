"""Challenge scoring.

Like badges, challenge standings are never stored — they're computed
live from existing workout data, scoped to the challenge's date window.
A challenge is just a saved (type, participants, date range); the
leaderboard is a query result, re-evaluated on every request.

Three types:
  volume       — total kg lifted (weight x reps, summed across all sets
                 and exercises) during the window. Rewards raw work done.
  exercise     — best (max) weight lifted on one named exercise during
                 the window. Weight-only, deliberately — mixing in
                 reps/duration/distance the way personal-bests' fallback
                 does would make cross-person comparison meaningless.
  consistency  — number of distinct days trained during the window.

kg/lb are converted to kg internally for fair comparison, same as the
"Top of the House" badge.
"""
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app import models

LB_TO_KG = 0.45359237


def _to_kg(weight: float, unit: str | None) -> float:
    return weight * LB_TO_KG if unit == "lb" else weight


def _window_bounds(start_date: date, end_date: date) -> tuple[datetime, datetime]:
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date + timedelta(days=1), datetime.min.time())
    return start_dt, end_dt


def compute_status(start_date: date, end_date: date) -> str:
    today = date.today()
    if today < start_date:
        return "upcoming"
    if today > end_date:
        return "completed"
    return "active"


def _score_volume(db: Session, user_id: int, start_dt: datetime, end_dt: datetime) -> float:
    rows = (
        db.query(
            models.SetEntry.weight, models.SetEntry.weight_unit, models.SetEntry.reps
        )
        .join(
            models.WorkoutSession,
            models.WorkoutSession.id == models.SetEntry.session_id,
        )
        .filter(
            models.WorkoutSession.user_id == user_id,
            models.WorkoutSession.date >= start_dt,
            models.WorkoutSession.date < end_dt,
            models.SetEntry.weight.isnot(None),
            models.SetEntry.reps.isnot(None),
        )
        .all()
    )
    return sum(_to_kg(w, u) * r for w, u, r in rows)


def _score_exercise(
    db: Session, user_id: int, exercise_name: str, start_dt: datetime, end_dt: datetime
) -> float:
    rows = (
        db.query(models.SetEntry.weight, models.SetEntry.weight_unit)
        .join(
            models.WorkoutSession,
            models.WorkoutSession.id == models.SetEntry.session_id,
        )
        .join(models.Exercise, models.Exercise.id == models.SetEntry.exercise_id)
        .filter(
            models.WorkoutSession.user_id == user_id,
            models.Exercise.name == exercise_name,
            models.WorkoutSession.date >= start_dt,
            models.WorkoutSession.date < end_dt,
            models.SetEntry.weight.isnot(None),
        )
        .all()
    )
    kgs = [_to_kg(w, u) for w, u in rows]
    return max(kgs) if kgs else 0.0


def _score_consistency(
    db: Session, user_id: int, start_dt: datetime, end_dt: datetime
) -> int:
    rows = (
        db.query(models.WorkoutSession.date)
        .filter(
            models.WorkoutSession.user_id == user_id,
            models.WorkoutSession.date >= start_dt,
            models.WorkoutSession.date < end_dt,
        )
        .all()
    )
    days = {d.date() for (d,) in rows}
    return len(days)


def compute_leaderboard(db: Session, challenge: models.Challenge) -> list[dict]:
    start_dt, end_dt = _window_bounds(challenge.start_date, challenge.end_date)

    entries = []
    for p in challenge.participants:
        if challenge.type == "volume":
            score = round(_score_volume(db, p.user_id, start_dt, end_dt), 1)
            unit = "kg"
        elif challenge.type == "exercise":
            score = round(
                _score_exercise(db, p.user_id, challenge.exercise_name, start_dt, end_dt),
                1,
            )
            unit = "kg"
        else:  # consistency
            score = _score_consistency(db, p.user_id, start_dt, end_dt)
            unit = "days"
        entries.append({"user": p.user, "score": score, "unit": unit})

    entries.sort(key=lambda e: -e["score"])
    rank = 1
    prev_score = None
    for i, e in enumerate(entries):
        if prev_score is not None and e["score"] < prev_score:
            rank = i + 1
        e["rank"] = rank
        e["is_leader"] = rank == 1 and e["score"] > 0
        prev_score = e["score"]

    return entries