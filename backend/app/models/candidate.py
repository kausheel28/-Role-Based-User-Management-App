# AI-assisted: see ai-assist.md
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class CandidateStatus(str, enum.Enum):
    NEW = "new"
    SCREENING = "screening"
    INTERVIEWING = "interviewing"
    OFFER = "offer"
    HIRED = "hired"
    REJECTED = "rejected"


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True)
    position = Column(String, nullable=False)
    status = Column(Enum(CandidateStatus, values_callable=lambda obj: [e.value for e in obj]), default=CandidateStatus.NEW.value)
    resume_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
