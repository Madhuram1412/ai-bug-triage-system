from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User, AuditLog
from backend.app.schemas import UserLogin, UserRegister, TokenResponse, UserResponse
from backend.app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Validate role
    role = user_in.role.lower()
    if role not in ["admin", "reporter", "developer"]:
        role = "developer"

    # Color for avatar
    colors = {"admin": "#ef4444", "reporter": "#10b981", "developer": "#3b82f6"}

    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
        role=role,
        team_id=user_in.team_id,
        avatar_color=colors.get(role, "#3b82f6")
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log audit
    audit = AuditLog(
        user_id=new_user.id,
        action="USER_REGISTERED",
        entity_type="User",
        entity_id=str(new_user.id),
        details=f"Registered account with role '{role}'"
    )
    db.add(audit)
    db.commit()

    token = create_access_token({"sub": str(new_user.id), "role": new_user.role, "email": new_user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role,
            "team_id": new_user.team_id,
            "team_name": new_user.team.name if new_user.team else None,
            "is_active": new_user.is_active,
            "avatar_color": new_user.avatar_color,
            "created_at": new_user.created_at
        }
    }

@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email).first()
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact an administrator."
        )

    # Strict backend role validation: If the user selected a specific role on the UI, verify compatibility
    if creds.role_requested and creds.role_requested.lower() != user.role.lower():
        # Inform the user clearly about role mismatch
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role mismatch: This account has the '{user.role.title()}' role, but '{creds.role_requested.title()}' was selected."
        )

    # Log audit
    audit = AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        entity_type="User",
        entity_id=str(user.id),
        details=f"Successful login as {user.role}"
    )
    db.add(audit)
    db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
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
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "team_id": current_user.team_id,
        "team_name": current_user.team.name if current_user.team else None,
        "is_active": current_user.is_active,
        "avatar_color": current_user.avatar_color,
        "created_at": current_user.created_at
    }
