# AI-assisted: see ai-assist.md
from typing import List
from sqlalchemy.orm import Session, joinedload
from app.crud.base import CRUDBase
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogCreate, AuditLog as AuditLogSchema


class CRUDAuditLog(CRUDBase[AuditLog, AuditLogCreate, AuditLogCreate]):
    def get_recent_logs(
        self, db: Session, *, limit: int = 10, user_role: str = None, user_id: int = None
    ) -> List[AuditLog]:
        from app.models.user import User  # Import here to avoid circular imports
        
        query = (
            db.query(AuditLog)
            .options(joinedload(AuditLog.actor), joinedload(AuditLog.target_user))
        )
        
        # Filter based on user role
        if user_role == "admin":
            # Admin sees all logs - no filtering
            pass
        elif user_role == "manager":
            # Manager sees all logs except admin actions
            query = query.join(AuditLog.actor).filter(User.role != "admin")
        elif user_role in ["agent", "viewer"]:
            # Agent/Viewer see only their own actions
            query = query.filter(AuditLog.actor_id == user_id)
        
        return (
            query
            .order_by(AuditLog.timestamp.desc())
            .limit(limit)
            .all()
        )    
    
    def get_user_logs(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[AuditLog]:
        return (
            db.query(AuditLog)
            .options(joinedload(AuditLog.actor), joinedload(AuditLog.target_user))
            .filter(
                (AuditLog.actor_id == user_id) | (AuditLog.target_user_id == user_id)
            )
            .order_by(AuditLog.timestamp.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )


audit_log = CRUDAuditLog(AuditLog)
