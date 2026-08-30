"""Gamification badges.

All 8 badges are computed live from existing data on every request —
deliberately no dedicated badges table, no "award" step to trigger, no
migration. A badge is just a query result, re-evaluated each time it's
asked for. Cheap enough for a household-sized app, and it means a badge
can never go stale or need backfilling.

Badges, once earned, stay earned — e.g. "On Fire" checks your longest
streak *ever*, not whether you're currently on one, since a badge is an
achievement, not a live status indicator.
"""
from datetime import date

from sqlalchemy.orm import Session

from app import models

LB_TO_KG = 0.45359237


def _to_kg(weight: float, unit: str | None) -> float:
    return weight * LB_TO_KG if unit == "lb" else weight


def _longest_streak(session_dates: list[date]) -> int:
    """Longest run of consecutive calendar days with at least one session."""
    if not session_dates:
        return 0
    ordered = sorted(set(session_dates))
    longest = current = 1
    for i in range(1, len(ordered)):
        gap = (ordered[i] - ordered[i - 1]).days
        if gap == 1:
            current += 1
            longest = max(longest, current)
        elif gap > 1:
            current = 1
    return longest


def _badge(key, name, description, emoji, earned, detail=""):
    return {
        "key": key,
        "name": name,
        "description": description,
        "emoji": emoji,
        "earned": earned,
        "detail": detail,
    }


def compute_badges(db: Session, user: models.User) -> list[dict]:
    sessions = (
        db.query(models.WorkoutSession)
        .filter(models.WorkoutSession.user_id == user.id)
        .all()
    )
    session_count = len(sessions)
    streak = _longest_streak([s.date.date() for s in sessions])

    distinct_exercise_count = (
        db.query(models.Exercise.id)
        .join(models.SetEntry, models.SetEntry.exercise_id == models.Exercise.id)
        .join(
            models.WorkoutSession,
            models.WorkoutSession.id == models.SetEntry.session_id,
        )
        .filter(models.WorkoutSession.user_id == user.id)
        .distinct()
        .count()
    )

    # Weight-bearing sets across EVERYONE, so "Top of the House" can
    # compare against the rest of the household without touching the
    # (deliberately simpler) personal-bests endpoint.
    weight_rows = (
        db.query(
            models.Exercise.name,
            models.WorkoutSession.user_id,
            models.WorkoutSession.date,
            models.SetEntry.weight,
            models.SetEntry.weight_unit,
        )
        .select_from(models.SetEntry)
        .join(models.Exercise, models.SetEntry.exercise_id == models.Exercise.id)
        .join(
            models.WorkoutSession,
            models.WorkoutSession.id == models.SetEntry.session_id,
        )
        .filter(models.SetEntry.weight.isnot(None))
        .all()
    )

    mine: dict[str, list[tuple]] = {}
    household_max: dict[str, float] = {}
    for name, uid, sdate, weight, unit in weight_rows:
        kg = _to_kg(weight, unit)
        household_max[name] = max(household_max.get(name, 0.0), kg)
        if uid == user.id:
            mine.setdefault(name, []).append((sdate, kg))

    # "New PR": your most recent logged set for at least one exercise is
    # also your all-time best for it (i.e. your last outing set a record).
    new_pr = any(
        max(entries, key=lambda e: e[0])[1] >= max(kg for _, kg in entries)
        for entries in mine.values()
    )

    top_of_house = any(
        max(kg for _, kg in entries) >= household_max.get(name, 0.0)
        for name, entries in mine.items()
    )

    metric_count = (
        db.query(models.BodyMetric)
        .filter(models.BodyMetric.user_id == user.id)
        .count()
    )

    return [
        _badge("first_rep", "First Rep", "Log your first session", "🎉",
               session_count >= 1),
        _badge("on_fire", "On Fire", "3-day workout streak", "🔥",
               streak >= 3,
               f"Best streak: {streak} day{'s' if streak != 1 else ''}"),
        _badge("iron_habit", "Iron Habit", "7-day workout streak", "🔥",
               streak >= 7,
               f"Best streak: {streak} day{'s' if streak != 1 else ''}"),
        _badge("fifty_sessions", "50 Sessions", "Log 50 workout sessions", "🏋️",
               session_count >= 50, f"{session_count}/50 sessions"),
        _badge("new_pr", "New PR",
               "Beat your own previous best on any exercise", "🥇", new_pr),
        _badge("top_of_house", "Top of the House",
               "Become the #1 lifter for an exercise", "👑", top_of_house),
        _badge("jack_of_all_trades", "Jack of All Trades",
               "Log 10+ distinct exercises", "🎯",
               distinct_exercise_count >= 10,
               f"{distinct_exercise_count}/10 exercises"),
        _badge("data_driven", "Data Driven",
               "Log your first body-metrics entry", "📊", metric_count >= 1),
    ]