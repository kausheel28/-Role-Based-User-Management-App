# AI-assisted: see ai-assist.md
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class AuditLogBase(BaseModel):
    action: str
    target: Optional[str] = None
    target_user_id: Optional[int] = None
    meta_data: Optional[Dict[str, Any]] = None


class AuditLogCreate(AuditLogBase):
    actor_id: int


class AuditLog(AuditLogBase):
    id: int
    actor_id: int
    timestamp: datetime
    actor_name: Optional[str] = None
    target_user_name: Optional[str] = None

    class Config:
        from_attributes = True
