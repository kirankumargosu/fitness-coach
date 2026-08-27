from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import auth, crud, models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(auth.get_current_user),
):
    # Now requires login — with open registration, login/register are
    # plain name+password forms (no picker), so this list only powers the
    # in-app "Users" directory for browsing others' personal bests.
    return crud.get_users(db)


@router.get("/{user_id}/personal-bests", response_model=list[schemas.PersonalBestOut])
def get_personal_bests(
    user_id: int,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(auth.get_current_user),
):
    user = crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.personal_bests(db, user_id)


@router.get("/{user_id}/profile", response_model=schemas.ProfileOut)
def get_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # Personal details (DOB, gender, height, weight, goal) are private —
    # only the person themselves, or the admin, can see them.
    user = crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    auth.check_owner_or_admin(current_user, user_id)
    return user


@router.patch("/{user_id}/profile", response_model=schemas.ProfileOut)
def update_profile(
    user_id: int,
    payload: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    user = crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    auth.check_owner_or_admin(current_user, user_id)
    return crud.update_profile(db, user, payload)