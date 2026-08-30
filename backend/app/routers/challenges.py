from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import auth, crud, models, schemas
from app import challenges as challenge_logic
from app.database import get_db

router = APIRouter(prefix="/api/challenges", tags=["challenges"])

# Open to anyone logged in — challenges are social/competitive, same
# visibility as personal bests and badges. Only deleting requires being
# the creator (or admin).


def _to_out(challenge: models.Challenge) -> schemas.ChallengeOut:
    return schemas.ChallengeOut(
        id=challenge.id,
        name=challenge.name,
        type=challenge.type,
        exercise_name=challenge.exercise_name,
        start_date=challenge.start_date,
        end_date=challenge.end_date,
        created_by=challenge.created_by,
        participants=[
            schemas.UserOut.model_validate(p.user) for p in challenge.participants
        ],
        status=challenge_logic.compute_status(challenge.start_date, challenge.end_date),
    )


@router.get("", response_model=list[schemas.ChallengeOut])
def list_challenges(
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(auth.get_current_user),
):
    return [_to_out(c) for c in crud.list_challenges(db)]


@router.post("", response_model=schemas.ChallengeOut, status_code=201)
def create_challenge(
    payload: schemas.ChallengeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    for uid in payload.participant_user_ids:
        if crud.get_user(db, uid) is None:
            raise HTTPException(status_code=404, detail=f"User {uid} not found")
    challenge = crud.create_challenge(db, current_user.id, payload)
    return _to_out(challenge)


@router.get("/{challenge_id}", response_model=schemas.ChallengeOut)
def get_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(auth.get_current_user),
):
    challenge = crud.get_challenge(db, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return _to_out(challenge)


@router.get("/{challenge_id}/leaderboard", response_model=schemas.LeaderboardOut)
def get_leaderboard(
    challenge_id: int,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(auth.get_current_user),
):
    challenge = crud.get_challenge(db, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")
    entries = challenge_logic.compute_leaderboard(db, challenge)
    return schemas.LeaderboardOut(
        challenge=_to_out(challenge),
        entries=[
            schemas.LeaderboardEntry(
                user=schemas.UserOut.model_validate(e["user"]),
                score=e["score"],
                unit=e["unit"],
                rank=e["rank"],
                is_leader=e["is_leader"],
            )
            for e in entries
        ],
    )


@router.delete("/{challenge_id}", status_code=204)
def delete_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    challenge = crud.get_challenge(db, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")
    auth.check_owner_or_admin(current_user, challenge.created_by)
    crud.delete_challenge(db, challenge)