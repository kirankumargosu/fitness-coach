from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import auth, crud, models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/water", tags=["water"])

# Private — same rule as nutrition and body metrics: only the owner and
# admin can see or touch these entries.


@router.post("", response_model=schemas.WaterEntryOut, status_code=201)
def create_entry(
    payload: schemas.WaterEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return crud.create_water_entry(db, current_user.id, payload)


@router.get("", response_model=list[schemas.WaterEntryOut])
def list_entries(
    user_id: int | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    target_id = user_id or current_user.id
    auth.check_owner_or_admin(current_user, target_id)
    return crud.list_water_entries(db, target_id, start, end)


@router.get("/summary", response_model=schemas.WaterSummaryOut)
def get_summary(
    date: date = Query(...),
    user_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    target_id = user_id or current_user.id
    auth.check_owner_or_admin(current_user, target_id)
    return crud.water_summary(db, target_id, date)


@router.delete("/{entry_id}", status_code=204)
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    entry = crud.get_water_entry(db, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    auth.check_owner_or_admin(current_user, entry.user_id)
    crud.delete_water_entry(db, entry)