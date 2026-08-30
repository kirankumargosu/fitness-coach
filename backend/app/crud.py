from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta

from app import models, schemas


# ---------- Users ----------
def get_users(db: Session) -> list[models.User]:
    return db.query(models.User).order_by(models.User.name).all()


def get_user(db: Session, user_id: int) -> models.User | None:
    return db.get(models.User, user_id)


def update_profile(
    db: Session, user: models.User, payload: schemas.ProfileUpdate
) -> models.User:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


# ---------- Exercises ----------
def get_exercises(db: Session) -> list[models.Exercise]:
    return db.query(models.Exercise).order_by(models.Exercise.name).all()


def get_or_create_exercise(
    db: Session, exercise_id: int | None, exercise_name: str | None
) -> models.Exercise:
    if exercise_id is not None:
        exercise = db.get(models.Exercise, exercise_id)
        if exercise is None:
            raise ValueError(f"Exercise id {exercise_id} not found")
        return exercise

    if not exercise_name or not exercise_name.strip():
        raise ValueError("Either exercise_id or exercise_name must be provided")

    name = exercise_name.strip().title()
    # exercise = db.query(models.Exercise).filter(models.Exercise.name == name).first()
    exercise = (
        db.query(models.Exercise).filter(models.Exercise.name.ilike(name)).first()
    )
    if exercise is None:
        exercise = models.Exercise(name=name)
        db.add(exercise)
        db.flush()
    return exercise


# ---------- Workout Sessions ----------
def create_session(
    db: Session, payload: schemas.WorkoutSessionCreate
) -> models.WorkoutSession:
    session = models.WorkoutSession(
        user_id=payload.user_id,
        title=payload.title,
        date=payload.date,
        duration_minutes=payload.duration_minutes,
        notes=payload.notes,
    )
    db.add(session)
    db.flush()

    for set_payload in payload.sets:
        exercise = get_or_create_exercise(
            db, set_payload.exercise_id, set_payload.exercise_name
        )
        db.add(
            models.SetEntry(
                session_id=session.id,
                exercise_id=exercise.id,
                set_number=set_payload.set_number,
                reps=set_payload.reps,
                weight=set_payload.weight,
                weight_unit=set_payload.weight_unit,
                duration_seconds=set_payload.duration_seconds,
                distance=set_payload.distance,
                distance_unit=set_payload.distance_unit,
                notes=set_payload.notes,
            )
        )

    db.commit()
    db.refresh(session)
    return session


def get_session(db: Session, session_id: int) -> models.WorkoutSession | None:
    return (
        db.query(models.WorkoutSession)
        .options(
            joinedload(models.WorkoutSession.user),
            joinedload(models.WorkoutSession.sets).joinedload(models.SetEntry.exercise),
        )
        .filter(models.WorkoutSession.id == session_id)
        .first()
    )


def list_sessions(
    db: Session,
    user_id: int | None = None,
    exercise_id: int | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[models.WorkoutSession]:
    query = db.query(models.WorkoutSession).options(
        joinedload(models.WorkoutSession.user),
        joinedload(models.WorkoutSession.sets).joinedload(models.SetEntry.exercise),
    )
    if user_id is not None:
        query = query.filter(models.WorkoutSession.user_id == user_id)
    if exercise_id is not None:
        query = query.join(models.SetEntry).filter(
            models.SetEntry.exercise_id == exercise_id
        )
    return (
        query.order_by(models.WorkoutSession.date.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def update_session(
    db: Session, session: models.WorkoutSession, payload: schemas.WorkoutSessionUpdate
) -> models.WorkoutSession:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(session, field, value)
    db.commit()
    db.refresh(session)
    return session


def delete_session(db: Session, session: models.WorkoutSession) -> None:
    db.delete(session)
    db.commit()


def add_set(
    db: Session, session: models.WorkoutSession, payload: schemas.SetEntryCreate
) -> models.SetEntry:
    exercise = get_or_create_exercise(db, payload.exercise_id, payload.exercise_name)
    set_entry = models.SetEntry(
        session_id=session.id,
        exercise_id=exercise.id,
        set_number=payload.set_number,
        reps=payload.reps,
        weight=payload.weight,
        weight_unit=payload.weight_unit,
        duration_seconds=payload.duration_seconds,
        distance=payload.distance,
        distance_unit=payload.distance_unit,
        notes=payload.notes,
    )
    db.add(set_entry)
    db.commit()
    db.refresh(set_entry)
    return set_entry


def delete_set(db: Session, set_entry: models.SetEntry) -> None:
    db.delete(set_entry)
    db.commit()


def get_set(db: Session, set_id: int) -> models.SetEntry | None:
    return db.get(models.SetEntry, set_id)

# ---------- Stats ----------
LB_TO_KG = 0.45359237


def _to_kg(weight: float, unit: str | None) -> float:
    return weight * LB_TO_KG if unit == "lb" else weight


def personal_bests(db: Session, user_id: int) -> list[dict]:
    """Return personal bests and rankings for weight, reps, distance, or time."""
    rows = (
        db.query(
            models.Exercise.name,
            models.WorkoutSession.user_id,
            models.User.name,
            models.SetEntry.weight,
            models.SetEntry.weight_unit,
            models.SetEntry.reps,
            models.SetEntry.duration_seconds,
            models.SetEntry.distance,
            models.SetEntry.distance_unit,
        )
        .select_from(models.SetEntry)
        .join(models.Exercise, models.SetEntry.exercise_id == models.Exercise.id)
        .join(
            models.WorkoutSession,
            models.WorkoutSession.id == models.SetEntry.session_id,
        )
        .join(models.User, models.User.id == models.WorkoutSession.user_id)
        .all()
    )

    by_exercise: dict[str, dict[int, dict]] = {}
    for exercise, uid, uname, weight, weight_unit, reps, duration, distance, distance_unit in rows:
        bucket = by_exercise.setdefault(exercise, {})
        best = bucket.setdefault(
            uid,
            {
                "name": uname,
                "weight": None,
                "reps": None,
                "distance": None,
                "time": None,
            },
        )

        if weight is not None:
            weight_kg = _to_kg(weight, weight_unit)
            if weight_kg > 0 and (
                best["weight"] is None or weight_kg > best["weight"]
            ):
                best["weight"] = weight_kg
        if reps is not None and reps > 0 and (
            best["reps"] is None or reps > best["reps"]
        ):
            best["reps"] = reps
        if distance is not None and distance > 0:
            distance_km = distance * 1.609344 if distance_unit == "mi" else distance
            if best["distance"] is None or distance_km > best["distance"]:
                best["distance"] = distance_km
        if duration is not None and duration > 0:
            duration_minutes = duration / 60
            if best["time"] is None or duration_minutes > best["time"]:
                best["time"] = duration_minutes

    def selected_best(best: dict) -> dict | None:
        for key, unit in (
            ("weight", "kg"),
            ("reps", "reps"),
            ("distance", "km"),
            ("time", "min"),
        ):
            if best[key] is not None and best[key] > 0:
                return {"value": best[key], "unit": unit, "metric": key}
        return None

    results = []
    for exercise in sorted(by_exercise):
        bucket = by_exercise[exercise]
        selected = {
            uid: selected_best(best)
            for uid, best in bucket.items()
        }
        mine = selected.get(user_id)
        if mine is None:
            continue

        comparable = [
            (uid, value)
            for uid, value in selected.items()
            if value is not None and value["metric"] == mine["metric"]
        ]
        rank = 1 + sum(
            1 for _, value in comparable if value["value"] > mine["value"]
        )
        total_lifters = len(comparable)
        percentile = round(
            sum(1 for _, value in comparable if value["value"] <= mine["value"])
            / total_lifters
            * 100
        )
        leader_uid, leader = max(comparable, key=lambda item: item[1]["value"])
        is_best = rank == 1

        results.append(
            {
                "exercise": exercise,
                "value": mine["value"],
                "unit": mine["unit"],
                "rank": rank,
                "total_lifters": total_lifters,
                "percentile": percentile,
                "is_best": is_best,
                "leader_name": bucket[leader_uid]["name"] if not is_best else None,
                "leader_value": leader["value"] if not is_best else None,
                "leader_units": leader["unit"] if not is_best else None,
            }
        )
    print("Personal bests:", results)
    return results


# Metrics
def get_latest_metric(db: Session, user_id: int) -> models.BodyMetric | None:
    return (
        db.query(models.BodyMetric)
        .filter(models.BodyMetric.user_id == user_id)
        .order_by(models.BodyMetric.date.desc())
        .first()
    )


def list_metrics(db: Session, user_id: int, limit: int = 180) -> list[models.BodyMetric]:
    return (
        db.query(models.BodyMetric)
        .filter(models.BodyMetric.user_id == user_id)
        .order_by(models.BodyMetric.date.asc())
        .limit(limit)
        .all()
    )


def get_metric(db: Session, metric_id: int) -> models.BodyMetric | None:
    return db.get(models.BodyMetric, metric_id)


def upsert_metric(db: Session, payload: schemas.BodyMetricCreate) -> models.BodyMetric:
    existing = (
        db.query(models.BodyMetric)
        .filter(
            models.BodyMetric.user_id == payload.user_id,
            models.BodyMetric.date == payload.date,
        )
        .first()
    )
    data = payload.model_dump(exclude={"user_id"})
    if existing is not None:
        for field, value in data.items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    metric = models.BodyMetric(user_id=payload.user_id, **data)
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


def delete_metric(db: Session, metric: models.BodyMetric) -> None:
    db.delete(metric)
    db.commit()


# --------- Challenges ----------
def create_challenge(
    db: Session, creator_id: int, payload: schemas.ChallengeCreate
) -> models.Challenge:
    challenge = models.Challenge(
        name=payload.name,
        type=payload.type,
        exercise_name=payload.exercise_name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        created_by=creator_id,
    )
    db.add(challenge)
    db.flush()
    for uid in payload.participant_user_ids:
        db.add(models.ChallengeParticipant(challenge_id=challenge.id, user_id=uid))
    db.commit()
    db.refresh(challenge)
    return challenge


def _challenge_query(db: Session):
    return db.query(models.Challenge).options(
        joinedload(models.Challenge.participants).joinedload(
            models.ChallengeParticipant.user
        )
    )

def list_challenges(db: Session) -> list[models.Challenge]:
    return _challenge_query(db).order_by(models.Challenge.start_date.desc()).all()


def get_challenge(db: Session, challenge_id: int) -> models.Challenge | None:
    return _challenge_query(db).filter(models.Challenge.id == challenge_id).first()


def delete_challenge(db: Session, challenge: models.Challenge) -> None:
    db.delete(challenge)
    db.commit()

# --------- Nutrition ----------
def create_nutrition_entry(
    db: Session,
    user_id: int,
    payload: schemas.NutritionEntryCreate,
    estimate: dict,
) -> models.NutritionEntry:
    entry = models.NutritionEntry(
        user_id=user_id,
        description=estimate.get("food") or payload.description,
        timestamp=payload.timestamp or datetime.utcnow(),
        calories=estimate["calories"],
        protein_g=estimate["protein_g"],
        carbs_g=estimate["carbs_g"],
        saturated_fat_g=estimate["saturated_fat_g"],
        unsaturated_fat_g=estimate["unsaturated_fat_g"],
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def list_nutrition_entries(
    db: Session,
    user_id: int,
    start: datetime | None = None,
    end: datetime | None = None,
) -> list[models.NutritionEntry]:
    query = db.query(models.NutritionEntry).filter(
        models.NutritionEntry.user_id == user_id
    )
    if start is not None:
        query = query.filter(models.NutritionEntry.timestamp >= start)
    if end is not None:
        query = query.filter(models.NutritionEntry.timestamp < end)
    return query.order_by(models.NutritionEntry.timestamp.desc()).all()


def get_nutrition_entry(db: Session, entry_id: int) -> models.NutritionEntry | None:
    return db.get(models.NutritionEntry, entry_id)


def update_nutrition_entry(
    db: Session, entry: models.NutritionEntry, payload: schemas.NutritionEntryUpdate
) -> models.NutritionEntry:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


def delete_nutrition_entry(db: Session, entry: models.NutritionEntry) -> None:
    db.delete(entry)
    db.commit()


def nutrition_summary(db: Session, user_id: int, day) -> dict:
    start_dt = datetime.combine(day, datetime.min.time())
    end_dt = start_dt + timedelta(days=1)
    entries = (
        db.query(models.NutritionEntry)
        .filter(
            models.NutritionEntry.user_id == user_id,
            models.NutritionEntry.timestamp >= start_dt,
            models.NutritionEntry.timestamp < end_dt,
        )
        .all()
    )
    return {
        "date": day,
        "calories": sum(e.calories for e in entries),
        "protein_g": sum(e.protein_g for e in entries),
        "carbs_g": sum(e.carbs_g for e in entries),
        "saturated_fat_g": sum(e.saturated_fat_g for e in entries),
        "unsaturated_fat_g": sum(e.unsaturated_fat_g for e in entries),
        "entry_count": len(entries),
    }

# Water

def create_water_entry(
    db: Session, user_id: int, payload: schemas.WaterEntryCreate
) -> models.WaterEntry:
    entry = models.WaterEntry(
        user_id=user_id,
        amount_ml=payload.amount_ml,
        timestamp=payload.timestamp or datetime.utcnow(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def list_water_entries(
    db: Session,
    user_id: int,
    start: datetime | None = None,
    end: datetime | None = None,
) -> list[models.WaterEntry]:
    query = db.query(models.WaterEntry).filter(models.WaterEntry.user_id == user_id)
    if start is not None:
        query = query.filter(models.WaterEntry.timestamp >= start)
    if end is not None:
        query = query.filter(models.WaterEntry.timestamp < end)
    return query.order_by(models.WaterEntry.timestamp.desc()).all()


def get_water_entry(db: Session, entry_id: int) -> models.WaterEntry | None:
    return db.get(models.WaterEntry, entry_id)


def delete_water_entry(db: Session, entry: models.WaterEntry) -> None:
    db.delete(entry)
    db.commit()


def water_summary(db: Session, user_id: int, day) -> dict:
    start_dt = datetime.combine(day, datetime.min.time())
    end_dt = start_dt + timedelta(days=1)
    entries = (
        db.query(models.WaterEntry)
        .filter(
            models.WaterEntry.user_id == user_id,
            models.WaterEntry.timestamp >= start_dt,
            models.WaterEntry.timestamp < end_dt,
        )
        .all()
    )
    return {
        "date": day,
        "total_ml": sum(e.amount_ml for e in entries),
        "entry_count": len(entries),
    }