from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import auth, crud, models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/sessions", tags=["workout sessions"])


def _session_summary(session) -> schemas.WorkoutSessionSummary:
    return schemas.WorkoutSessionSummary(
        id=session.id,
        user=session.user,
        title=session.title,
        date=session.date,
        duration_minutes=session.duration_minutes,
        set_count=len(session.sets),
        total_volume=sum(
            (s.weight or 0) * (s.reps or 0) for s in session.sets
        ),
    )


# Workout history (list + detail) is now OWN DATA ONLY for regular
# members — admin can still see anyone's. This is the "view only others'
# personal bests, not their full history" rule; personal-bests (in
# routers/users.py) stays open to any logged-in user for any user_id.


@router.get("", response_model=list[schemas.WorkoutSessionSummary])
def list_sessions(
    user_id: int | None = None,
    exercise_id: int | None = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role != "admin":
        # Ignore whatever was requested — a member only ever sees their
        # own sessions, no matter what user_id they pass.
        user_id = current_user.id
    sessions = crud.list_sessions(db, user_id, exercise_id, limit, offset)
    return [_session_summary(s) for s in sessions]


@router.post("", response_model=schemas.WorkoutSessionOut, status_code=201)
def create_session(
    payload: schemas.WorkoutSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if crud.get_user(db, payload.user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")
    auth.check_owner_or_admin(current_user, payload.user_id)
    try:
        return crud.create_session(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{session_id}", response_model=schemas.WorkoutSessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    session = crud.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    auth.check_owner_or_admin(current_user, session.user_id)
    return session


@router.patch("/{session_id}", response_model=schemas.WorkoutSessionOut)
def update_session(
    session_id: int,
    payload: schemas.WorkoutSessionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    session = crud.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    auth.check_owner_or_admin(current_user, session.user_id)
    return crud.update_session(db, session, payload)


@router.delete("/{session_id}", status_code=204)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    session = crud.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    auth.check_owner_or_admin(current_user, session.user_id)
    crud.delete_session(db, session)


@router.post("/{session_id}/sets", response_model=schemas.SetEntryOut, status_code=201)
def add_set(
    session_id: int,
    payload: schemas.SetEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    session = crud.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    auth.check_owner_or_admin(current_user, session.user_id)
    try:
        return crud.add_set(db, session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{session_id}/sets/{set_id}", status_code=204)
def delete_set(
    session_id: int,
    set_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    set_entry = crud.get_set(db, set_id)
    if set_entry is None or set_entry.session_id != session_id:
        raise HTTPException(status_code=404, detail="Set not found")
    auth.check_owner_or_admin(current_user, set_entry.session.user_id)
    crud.delete_set(db, set_entry)