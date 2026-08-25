from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app import models, schemas


# ---------- Users ----------
def get_users(db: Session) -> list[models.User]:
    return db.query(models.User).order_by(models.User.name).all()


def get_user(db: Session, user_id: int) -> models.User | None:
    return db.get(models.User, user_id)


def ensure_seed_users(db: Session, names: list[str]) -> None:
    for name in names:
        exists = db.query(models.User).filter(models.User.name == name).first()
        if not exists:
            db.add(models.User(name=name))
    db.commit()


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

    name = exercise_name.strip()
    exercise = db.query(models.Exercise).filter(models.Exercise.name == name).first()
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
# def personal_bests(db: Session, user_id: int) -> list[dict]:
#     """Best (max weight) strength set per exercise for a given user.
#     Cardio-only exercises (no weight logged) are excluded here — there's
#     no weight PB to show for a jog.
#     """
#     rows = (
#         db.query(
#             models.Exercise.name,
#             func.max(models.SetEntry.weight).label("max_weight"),
#         )
#         .join(models.SetEntry, models.SetEntry.exercise_id == models.Exercise.id)
#         .join(
#             models.WorkoutSession,
#             models.WorkoutSession.id == models.SetEntry.session_id,
#         )
#         .filter(models.WorkoutSession.user_id == user_id)
#         .filter(models.SetEntry.weight.isnot(None))
#         .group_by(models.Exercise.name)
#         .order_by(models.Exercise.name)
#         .all()
#     )
#     return [{"exercise": name, "max_weight": max_weight} for name, max_weight in rows]

def personal_bests(db: Session, user_id: int) -> list[dict]:
    """Best set per exercise for a given user."""
    rows = (
        db.query(
            models.Exercise.name,
            func.max(models.SetEntry.weight).label("max_weight"),
            func.max(models.SetEntry.reps).label("max_reps"),
            func.max(models.SetEntry.duration_seconds).label("max_duration"),
            func.max(models.SetEntry.distance).label("max_distance"),
        )
        .join(
            models.SetEntry,
            models.SetEntry.exercise_id == models.Exercise.id,
        )
        .join(
            models.WorkoutSession,
            models.WorkoutSession.id == models.SetEntry.session_id,
        )
        .filter(models.WorkoutSession.user_id == user_id)
        .group_by(models.Exercise.name)
        .order_by(models.Exercise.name)
        .all()
    )

    return [
        {
            "exercise": name,
            "value": max_weight if max_weight and max_weight > 0 else max_reps if max_reps and max_reps > 0 else max_duration/60 if max_duration and max_duration > 0 else max_distance,
            "unit": "kg" if max_weight and max_weight > 0 else "reps" if max_reps and max_reps > 0 else "min" if max_duration/60 and max_duration > 0 else "km",
        }
        for name, max_weight, max_reps, max_duration, max_distance in rows
    ]
