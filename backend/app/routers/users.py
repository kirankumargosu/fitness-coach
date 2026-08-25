from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db)):
    return crud.get_users(db)


@router.get("/whoami", response_model=schemas.UserOut | None)
def whoami(
    x_remote_user: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Maps the HTTP Basic Auth username (forwarded by the edge nginx as
    X-Remote-User) to a known app user, so the frontend can default to that
    person's own tab. Returns null if there's no header (e.g. local dev
    without nginx in front) or the username isn't a recognized user."""
    if not x_remote_user:
        return None
    for user in crud.get_users(db):
        if user.name.lower() == x_remote_user.lower():
            return user
    return None


@router.get("/{user_id}/personal-bests")
def get_personal_bests(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.personal_bests(db, user_id)