from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import auth, crud, models, schemas
from app.database import get_db
from app.nutrition_ai import NutritionAIError, estimate_nutrition

router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])

# Private — same rule as body metrics: only the owner and admin can see
# or touch these entries.


@router.post("", response_model=schemas.NutritionEntryOut, status_code=201)
def create_entry(
    payload: schemas.NutritionEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    try:
        estimate = estimate_nutrition(payload.description)
    except NutritionAIError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return crud.create_nutrition_entry(db, current_user.id, payload, estimate)


@router.get("", response_model=list[schemas.NutritionEntryOut])
def list_entries(
    user_id: int | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    target_id = user_id or current_user.id
    auth.check_owner_or_admin(current_user, target_id)
    return crud.list_nutrition_entries(db, target_id, start, end)


@router.get("/summary", response_model=schemas.NutritionSummaryOut)
def get_summary(
    date: date = Query(...),
    user_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    target_id = user_id or current_user.id
    auth.check_owner_or_admin(current_user, target_id)
    return crud.nutrition_summary(db, target_id, date)


@router.get("/{entry_id}", response_model=schemas.NutritionEntryOut)
def get_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    entry = crud.get_nutrition_entry(db, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    auth.check_owner_or_admin(current_user, entry.user_id)
    return entry


@router.patch("/{entry_id}", response_model=schemas.NutritionEntryOut)
def update_entry(
    entry_id: int,
    payload: schemas.NutritionEntryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    entry = crud.get_nutrition_entry(db, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    auth.check_owner_or_admin(current_user, entry.user_id)
    return crud.update_nutrition_entry(db, entry, payload)


@router.delete("/{entry_id}", status_code=204)
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    entry = crud.get_nutrition_entry(db, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    auth.check_owner_or_admin(current_user, entry.user_id)
    crud.delete_nutrition_entry(db, entry)