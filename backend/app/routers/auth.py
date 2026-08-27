from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import auth, models, schemas
from app.config import ADMIN_USER
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserOut)
def register(
    payload: schemas.RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Open sign-up: anyone can create an account with any (unique) name.
    If a name matches an existing account that hasn't set a password yet
    (a leftover from an older, fixed-roster version of this app), this
    claims that account instead of creating a duplicate.
    Whoever's name matches ADMIN_USER (see main.py) becomes admin.
    """
    name = payload.name.strip()
    user = (
        db.query(models.User)
        .filter(models.User.name.ilike(name))
        .first()
    )

    if user is not None and user.has_password:
        raise HTTPException(
            status_code=409,
            detail="That name is already registered — log in instead.",
        )

    if user is None:
        user = models.User(name=name, role="member")
        db.add(user)

    user.salt = auth.make_salt()
    user.password_hash = auth.hash_password(payload.password, user.salt)
    if name.lower() == ADMIN_USER.lower():
        user.role = "admin"

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="That name is already registered — log in instead.",
        )
    db.refresh(user)

    auth.create_session(db, user, response)
    return user


@router.post("/login", response_model=schemas.UserOut)
def login(
    payload: schemas.LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.name.ilike(payload.name.strip())).first()
    if user is None or not user.has_password:
        raise HTTPException(
            status_code=400, detail="No such account, or not registered yet"
        )
    if not auth.verify_password(payload.password, user.salt, user.password_hash):
        raise HTTPException(status_code=401, detail="Wrong password")

    auth.create_session(db, user, response)
    return user


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    # Reads the cookie directly rather than requiring a valid session, so
    # logging out always succeeds even if the session already expired.
    token = request.cookies.get(auth.SESSION_COOKIE_NAME)
    auth.destroy_session(db, token, response)


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(auth.get_current_user)):
    return user