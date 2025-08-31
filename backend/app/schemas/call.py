# AI-assisted: see ai-assist.md
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.call import CallType, CallStatus


class CallBase(BaseModel):
    caller_name: str
    caller_number: str
    call_type: CallType
    status: CallStatus
    duration_seconds: int = 0
    is_important: bool = False
    notes: Optional[str] = None


class CallCreate(CallBase):
    pass


class CallUpdate(BaseModel):
    caller_name: Optional[str] = None
    caller_number: Optional[str] = None
    call_type: Optional[CallType] = None
    status: Optional[CallStatus] = None
    duration_seconds: Optional[int] = None
    is_important: Optional[bool] = None
    notes: Optional[str] = None


class Call(CallBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
