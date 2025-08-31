# AI-assisted: see ai-assist.md
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.db.base import Base


class PageName(str, enum.Enum):
    DASHBOARD = "dashboard"
    INTERVIEWS = "interviews"
    CANDIDATES = "candidates"
    CALLS = "calls"
    SETTINGS = "settings"
    USER_MANAGEMENT = "user_management"


class UserPageAccess(Base):
    __tablename__ = "user_page_access"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    page_name = Column(Enum(PageName, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    has_access = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="page_access_overrides")

    # Ensure unique constraint on user_id + page_name
    __table_args__ = (
        {"sqlite_autoincrement": True},
    )
