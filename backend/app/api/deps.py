# deps.py
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.security import verify_token
from app.db.session import get_db
from app.crud.user import user as crud_user
from app.crud import audit_log as crud_audit_log
from app.models.user import User
from app.models.user_page_access import PageName
from app.schemas.audit_log import AuditLogCreate

security = HTTPBearer()


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    user_id = verify_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_instance = crud_user.get(db, id=int(user_id))
    if user_instance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not crud_user.is_active(user_instance):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    return user_instance


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Alias for get_current_user"""
    return current_user


def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure current user is an admin"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return current_user


def get_current_admin_or_manager_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure current user is an admin or manager"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin or Manager access required.",
        )
    return current_user


def check_page_access(page_name: PageName):
    """Dependency to check user access to a specific page"""
    def _check_access(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        permissions = crud_user.get_user_permissions(db, current_user)
        if not permissions.get(page_name.value, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied to {page_name.value} page",
            )
        return current_user

    return _check_access


def log_user_action(
    action: str,
    target: Optional[str] = None,
    target_user_id: Optional[int] = None,
    metadata: Optional[dict] = None,
):
    """Dependency to log user actions"""
    def _log_action(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        audit_log_data = AuditLogCreate(
            actor_id=current_user.id,
            action=action,
            target=target,
            target_user_id=target_user_id,
            metadata=metadata,
        )
        crud_audit_log.audit_log.create(db, obj_in=audit_log_data)
        return current_user

    return _log_action
