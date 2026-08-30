from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import auth, crud, models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/exercises", tags=["exercises"])


@router.get("", response_model=list[schemas.ExerciseOut])
def list_exercises(
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(auth.get_current_user),
):
    return crud.get_exercises(db)


@router.post("", response_model=schemas.ExerciseOut, status_code=201)
def create_exercise(
    payload: schemas.ExerciseCreate,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(auth.get_current_user),
):
    name = payload.name.strip()
    existing = db.query(models.Exercise).filter(models.Exercise.name.ilike(name)).first()
    if existing is not None:
        return existing

    exercise = models.Exercise(name=payload.name.strip(), category=payload.category)
    db.add(exercise)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Exercise already exists")
    db.refresh(exercise)
    return exercise
