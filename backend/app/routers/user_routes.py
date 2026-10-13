from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User, Team, AuditLog
from backend.app.schemas import UserResponse, UserRoleUpdate
from backend.app.auth import require_role

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def get_users(
    current_user: User = Depends(require_role(["admin", "developer"])),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "team_id": u.team_id,
            "team_name": u.team.name if u.team else None,
            "is_active": u.is_active,
            "avatar_color": u.avatar_color,
            "created_at": u.created_at
        } for u in users
    ]

@router.put("/{id}/role", response_model=UserResponse)
def update_user_role(
    id: int,
    role_update: UserRoleUpdate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    old_role = user.role
    user.role = role_update.role.lower()
    if role_update.team_id is not None:
        user.team_id = role_update.team_id if role_update.team_id != 0 else None

    audit = AuditLog(
        user_id=current_user.id,
        action="USER_ROLE_UPDATED",
        entity_type="User",
        entity_id=str(user.id),
        details=f"Changed role of {user.email} from {old_role} to {user.role}, team: {user.team_id}"
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "team_id": user.team_id,
        "team_name": user.team.name if user.team else None,
        "is_active": user.is_active,
        "avatar_color": user.avatar_color,
        "created_at": user.created_at
    }
