# AI-assisted: see ai-assist.md
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.interview import InterviewStatus


class InterviewBase(BaseModel):
    candidate_id: int
    interviewer_name: str
    scheduled_at: datetime
    duration_minutes: int = 60
    status: InterviewStatus = InterviewStatus.SCHEDULED
    interview_type: str
    notes: Optional[str] = None
    score: Optional[int] = None


class InterviewCreate(InterviewBase):
    pass


class InterviewUpdate(BaseModel):
    interviewer_name: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[InterviewStatus] = None
    interview_type: Optional[str] = None
    notes: Optional[str] = None
    score: Optional[int] = None


class Interview(InterviewBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    candidate_name: Optional[str] = None

    class Config:
        from_attributes = True
