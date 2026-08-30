from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.config import ADMIN_USER
from app.database import Base, SessionLocal, engine
from app.migrations import (
    migrate_legacy_set_entries,
    migrate_users_add_auth_columns,
    migrate_users_add_profile_columns,
)
from app.routers import auth as auth_router
from app.routers import challenges, exercises, metrics, nutrition, users, workouts
import os

# Registration is open — anyone can create an account with any name (see
# routers/auth.py). There's no fixed roster to seed anymore. The only
# special-cased name is ADMIN_USER, who gets promoted to admin whenever
# they register (or, for an account that already existed from before this
# was open registration, promoted here on startup too).


@asynccontextmanager
async def lifespan(app: FastAPI):
    migrate_legacy_set_entries(engine)
    migrate_users_add_auth_columns(engine)
    migrate_users_add_profile_columns(engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin = (
            db.query(models.User)
            .filter(models.User.name.ilike(ADMIN_USER))
            .first()
        )
        if admin is not None and admin.role != "admin":
            admin.role = "admin"
            db.commit()
    finally:
        db.close()
    yield

DOCS_ENABLED = os.getenv("ENABLE_DOCS", "false").lower() == "true"

app = FastAPI(
    title="Gym Tracker API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if DOCS_ENABLED else None,
    redoc_url="/redoc" if DOCS_ENABLED else None,
    openapi_url="/openapi.json" if DOCS_ENABLED else None,
)

# Cookie-based sessions require explicit origins (not "*") once
# allow_credentials is on. In production everything is same-origin behind
# nginx, so CORS doesn't come into play there at all — this only matters
# for running the Vite dev server without its proxy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(users.router)
app.include_router(exercises.router)
app.include_router(workouts.router)
app.include_router(metrics.router)
app.include_router(challenges.router)
app.include_router(nutrition.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}