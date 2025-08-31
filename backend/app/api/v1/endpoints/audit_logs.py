# AI-assisted: see ai-assist.md
from typing import Any, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.crud.audit_log import CRUDAuditLog
from app.db.session import get_db
from app.models.user import User
from app.models.audit_log import AuditLog as AuditLogModel
from app.models.user_page_access import PageName
from app.schemas.audit_log import AuditLog

router = APIRouter()

# Instantiate CRUD object
crud_audit_log = CRUDAuditLog(AuditLogModel)


@router.get("/recent", response_model=List[AuditLog])
def get_recent_audit_logs(
    db: Session = Depends(get_db),
    limit: int = Query(default=50, lte=100),
    current_user: User = Depends(deps.get_current_user),  # Changed: Now all users can access
) -> Any:
    """
    Get recent audit logs for dashboard display.
    - Admin: sees all logs
    - Manager: sees all logs except admin actions
    - Agent/Viewer: sees only their own actions
    """
    logs = crud_audit_log.get_recent_logs(
        db, 
        limit=limit, 
        user_role=current_user.role.value if hasattr(current_user.role, 'value') else current_user.role,
        user_id=current_user.id
    )

    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "actor_id": log.actor_id,
            "action": log.action,
            "target": log.target,
            "target_user_id": log.target_user_id,
            "metadata": log.meta_data,
            "timestamp": log.timestamp,
            "actor_name": log.actor.full_name if log.actor else None,
            "target_user_name": log.target_user.full_name if log.target_user else None
        })

    return result


@router.get("/user/{user_id}", response_model=List[AuditLog])
def get_user_audit_logs(
    user_id: int,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=50, lte=100),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get audit logs for a specific user.
    Only admins can view other users' logs, regular users can only view their own.
    """
    if current_user.role != "admin" and current_user.id != user_id:
        user_id = current_user.id

    logs = crud_audit_log.get_user_logs(db, user_id=user_id, skip=skip, limit=limit)

    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "actor_id": log.actor_id,
            "action": log.action,
            "target": log.target,
            "target_user_id": log.target_user_id,
            "metadata": log.metadata,
            "timestamp": log.timestamp,
            "actor_name": log.actor.full_name if log.actor else None,
            "target_user_name": log.target_user.full_name if log.target_user else None
        })

    return result


@router.get("/", response_model=List[AuditLog])
def get_all_audit_logs(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=50, lte=100),
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Get all audit logs. Admin only.
    """
    logs = crud_audit_log.get_multi(db, skip=skip, limit=limit)

    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "actor_id": log.actor_id,
            "action": log.action,
            "target": log.target,
            "target_user_id": log.target_user_id,
            "metadata": log.metadata,
            "timestamp": log.timestamp,
            "actor_name": log.actor.full_name if log.actor else None,
            "target_user_name": log.target_user.full_name if log.target_user else None
        })

    return result
