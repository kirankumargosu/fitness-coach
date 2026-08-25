from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import crud, models
from app.database import Base, SessionLocal, engine
from app.migrations import migrate_legacy_set_entries
from app.routers import exercises, users, workouts

SEED_USERS = ["Kiran", "Tony", "Anish"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    migrate_legacy_set_entries(engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        crud.ensure_seed_users(db, SEED_USERS)
    finally:
        db.close()
    yield


app = FastAPI(title="Gym Tracker API", version="0.1.0", lifespan=lifespan)

# The nginx reverse proxy is same-origin in production, but CORS is left
# open for local dev where the Vite dev server runs on a different port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(exercises.router)
app.include_router(workouts.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}