from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import auth, crud, models, schemas
from app.database import get_db
from app.nutrition_ai import NutritionAIError, ask_nutrition_question, estimate_nutrition

router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])

# Private — same rule as body metrics: only the owner and admin can see
# or touch these entries.


@router.post("", response_model=list[schemas.NutritionEntryOut], status_code=201)
def create_entry(
    payload: schemas.NutritionEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    today = date.today()
    
    # 1. Fetch today's summary and logged entries for context
    summary = crud.nutrition_summary(db, current_user.id, today)
    entries = crud.list_nutrition_entries(
        db,
        user_id=current_user.id,
        start=datetime.combine(today, datetime.min.time()),
        end=datetime.combine(today, datetime.max.time()),
    )

    # 2. Format context for the prompt
    logged_foods = ", ".join([entry.description for entry in entries]) if entries else "None"

    context = (
        f"Date: {today}\n"
        f"Logged Foods: {logged_foods}\n"
        f"Totals -> Calories: {summary.get('calories', 0)} kcal, "
        f"Protein: {summary.get('protein_g', 0)}g, "
        f"Carbs: {summary.get('carbs_g', 0)}g, "
        f"Saturated Fat: {summary.get('saturated_fat_g', 0)}g, "
        f"Unsaturated Fat: {summary.get('unsaturated_fat_g', 0)}g"
    )
    try:
        estimates = estimate_nutrition(payload.description, context=context)
    except NutritionAIError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return crud.create_nutrition_entries(db, current_user.id, payload, estimates)


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

@router.post("/ask", response_model=schemas.NutritionAskResponse)
def ask(
    payload: schemas.NutritionAskRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    today = date.today()
    
    # 1. Fetch today's summary and logged entries for context
    summary = crud.nutrition_summary(db, current_user.id, today)
    entries = crud.list_nutrition_entries(
        db,
        user_id=current_user.id,
        start=datetime.combine(today, datetime.min.time()),
        end=datetime.combine(today, datetime.max.time()),
    )

    # 2. Format context for the prompt
    logged_foods = ", ".join([entry.description for entry in entries]) if entries else "None"

    context = (
        f"Date: {today}\n"
        f"Logged Foods: {logged_foods}\n"
        f"Totals -> Calories: {summary.get('calories', 0)} kcal, "
        f"Protein: {summary.get('protein_g', 0)}g, "
        f"Carbs: {summary.get('carbs_g', 0)}g, "
        f"Saturated Fat: {summary.get('saturated_fat_g', 0)}g, "
        f"Unsaturated Fat: {summary.get('unsaturated_fat_g', 0)}g"
    )
    
    try:
        answer = ask_nutrition_question(payload.question, context=context)
    except NutritionAIError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return schemas.NutritionAskResponse(answer=answer)

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