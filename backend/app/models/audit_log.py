# AI-assisted: see ai-assist.md
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # e.g., "login", "create_user", "update_role", etc.
    target = Column(String, nullable=True)  # What was acted upon (e.g., "user:123", "page:dashboard")
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # For user-related actions
    meta_data = Column(JSON, nullable=True)  # Additional context data
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    actor = relationship("User", foreign_keys=[actor_id], back_populates="audit_logs_as_actor")
    target_user = relationship("User", foreign_keys=[target_user_id], back_populates="audit_logs_as_target")
