# auth.py: AI-assisted
from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.crud.user import CRUDUser
from app.crud.audit_log import CRUDAuditLog
from app.db.session import get_db
from app.models.user import User
from app.models.audit_log import AuditLog as AuditLogModel
from app.schemas.auth import LoginRequest, Token
from app.schemas.audit_log import AuditLogCreate
from app.schemas.user import User as UserSchema  # Pydantic schema
from app.middleware import auth_rate_limit, get_csrf_token

router = APIRouter()
security_scheme = HTTPBearer()

# CRUD instances
crud_user = CRUDUser(User)
crud_audit_log = CRUDAuditLog(AuditLogModel)


@router.post("/login", response_model=Token)
@auth_rate_limit()
def login_access_token(
    request: Request,
    *,
    db: Session = Depends(get_db),
    user_credentials: LoginRequest,
    response: Response
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = crud_user.authenticate(
        db, email=user_credentials.email, password=user_credentials.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    elif not crud_user.is_active(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    refresh_token_expires = timedelta(days=settings.refresh_token_expire_days)

    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    refresh_token = security.create_refresh_token(
        user.id, expires_delta=refresh_token_expires
    )

    # Set refresh token as httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=False,  # Change to True in production
        samesite="lax"
    )

    # Log login
    audit_log_data = AuditLogCreate(
        actor_id=user.id,
        action="login",
        target=f"user:{user.id}",
        metadata={"email": user.email}
    )
    crud_audit_log.create(db, obj_in=audit_log_data)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
def refresh_token(
    *,
    db: Session = Depends(get_db),
    request: Request,
    response: Response
) -> Any:
    """
    Refresh access token using refresh token from cookie
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found"
        )

    user_id = security.verify_refresh_token(refresh_token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user = crud_user.get(db, id=int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if not crud_user.is_active(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    # Create new tokens
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    refresh_token_expires = timedelta(days=settings.refresh_token_expire_days)

    new_access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    new_refresh_token = security.create_refresh_token(
        user.id, expires_delta=refresh_token_expires
    )

    # Update refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=False,
        samesite="lax"
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.post("/logout")
def logout(
    *,
    response: Response,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Logout user by clearing refresh token cookie
    """
    response.delete_cookie(key="refresh_token")

    # Log logout
    audit_log_data = AuditLogCreate(
        actor_id=current_user.id,
        action="logout",
        target=f"user:{current_user.id}",
        metadata={"email": current_user.email}
    )
    crud_audit_log.create(db, obj_in=audit_log_data)

    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserSchema)
def read_users_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user


@router.get("/csrf-token")
def get_csrf_token_endpoint(request: Request) -> Any:
    """
    Get CSRF token for form submissions
    """
    token = get_csrf_token(request)
    return {"csrf_token": token}
