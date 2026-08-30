from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import auth, crud, models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/metrics", tags=["body metrics"])

# Body metrics are private — same rule as Profile's personal details:
# only the owner and the admin can read or write them.


@router.get("/latest", response_model=schemas.BodyMetricOut | None)
def get_latest(
    user_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    target_id = user_id or current_user.id
    auth.check_owner_or_admin(current_user, target_id)
    return crud.get_latest_metric(db, target_id)


@router.get("", response_model=list[schemas.BodyMetricOut])
def list_metrics(
    user_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    target_id = user_id or current_user.id
    auth.check_owner_or_admin(current_user, target_id)
    return crud.list_metrics(db, target_id)


@router.post("", response_model=schemas.BodyMetricOut, status_code=201)
def upsert_metric(
    payload: schemas.BodyMetricCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if crud.get_user(db, payload.user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")
    auth.check_owner_or_admin(current_user, payload.user_id)
    return crud.upsert_metric(db, payload)


@router.delete("/{metric_id}", status_code=204)
def delete_metric(
    metric_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    metric = crud.get_metric(db, metric_id)
    if metric is None:
        raise HTTPException(status_code=404, detail="Metric not found")
    auth.check_owner_or_admin(current_user, metric.user_id)
    crud.delete_metric(db, metric)