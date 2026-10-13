from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Team, User, Bug
from backend.app.schemas import TeamResponse, TeamCreate
from backend.app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/teams", tags=["Teams"])

@router.get("", response_model=List[TeamResponse])
def get_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    results = []
    for t in teams:
        members = [
            {"id": m.id, "full_name": m.full_name, "email": m.email, "role": m.role}
            for m in t.members if m.is_active
        ]
        bug_count = db.query(Bug).filter(Bug.assigned_team_id == t.id).count()
        results.append({
            "id": t.id,
            "name": t.name,
            "slug": t.slug,
            "description": t.description,
            "color": t.color,
            "lead_id": t.lead_id,
            "member_count": len(members),
            "bug_count": bug_count,
            "members": members
        })
    return results

@router.post("", response_model=TeamResponse)
def create_team(
    team_in: TeamCreate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    existing = db.query(Team).filter(Team.name == team_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Team name already exists.")

    team = Team(
        name=team_in.name,
        slug=team_in.slug,
        description=team_in.description,
        color=team_in.color or "#6366f1"
    )
    db.add(team)
    db.commit()
    db.refresh(team)

    return {
        "id": team.id,
        "name": team.name,
        "slug": team.slug,
        "description": team.description,
        "color": team.color,
        "lead_id": team.lead_id,
        "member_count": 0,
        "bug_count": 0,
        "members": []
    }
