"""Password hashing + cookie-based sessions.

Deliberately stdlib-only (hashlib's PBKDF2 + secrets) rather than pulling
in bcrypt/passlib — this is a three-person household app, not something
that needs an extra native dependency in the Docker build for it.
"""
import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session as DBSession

from app import models
from app.database import get_db

PBKDF2_ITERATIONS = 260_000
SESSION_COOKIE_NAME = "iron_log_session"
SESSION_LIFETIME = timedelta(days=30)


def hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERATIONS
    ).hex()


def make_salt() -> str:
    return secrets.token_hex(16)


def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    return secrets.compare_digest(hash_password(password, salt), expected_hash)


def create_session(db: DBSession, user: models.User, response: Response) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + SESSION_LIFETIME
    db.add(models.AuthSession(token=token, user_id=user.id, expires_at=expires_at))
    db.commit()
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=int(SESSION_LIFETIME.total_seconds()),
        path="/",
    )
    return token


def destroy_session(db: DBSession, token: str | None, response: Response) -> None:
    if token:
        auth_session = db.get(models.AuthSession, token)
        if auth_session is not None:
            db.delete(auth_session)
            db.commit()
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")


def get_current_user(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: DBSession = Depends(get_db),
) -> models.User:
    """Required auth: raises 401 if there's no valid session."""
    if session_token is None:
        raise HTTPException(status_code=401, detail="Not logged in")

    auth_session = db.get(models.AuthSession, session_token)
    if auth_session is None or auth_session.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Session expired or invalid")

    user = db.get(models.User, auth_session.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return user


def require_admin(user: models.User = Depends(get_current_user)) -> models.User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return user


def check_owner_or_admin(user: models.User, owner_user_id: int) -> None:
    """Raise 403 unless `user` is that owner or an admin."""
    if user.role != "admin" and user.id != owner_user_id:
        raise HTTPException(
            status_code=403, detail="You can only change your own data"
        )
