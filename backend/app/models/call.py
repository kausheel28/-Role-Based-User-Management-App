# AI-assisted: see ai-assist.md
from sqlalchemy import Column, Integer, String, DateTime, Enum, Boolean
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class CallType(str, enum.Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class CallStatus(str, enum.Enum):
    ANSWERED = "answered"
    MISSED = "missed"
    BUSY = "busy"
    NO_ANSWER = "no_answer"


class Call(Base):
    __tablename__ = "calls"

    id = Column(Integer, primary_key=True, index=True)
    caller_name = Column(String, nullable=False)
    caller_number = Column(String, nullable=False)
    call_type = Column(Enum(CallType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    status = Column(Enum(CallStatus, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    duration_seconds = Column(Integer, default=0)
    is_important = Column(Boolean, default=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
