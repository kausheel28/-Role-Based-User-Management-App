# AI-assisted: see ai-assist.md
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.candidate import CandidateStatus


class CandidateBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    position: str
    status: CandidateStatus = CandidateStatus.NEW
    resume_url: Optional[str] = None
    notes: Optional[str] = None


class CandidateCreate(CandidateBase):
    pass


class CandidateUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    status: Optional[CandidateStatus] = None
    resume_url: Optional[str] = None
    notes: Optional[str] = None


class Candidate(CandidateBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
