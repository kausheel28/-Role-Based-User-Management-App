# AI-assisted: see ai-assist.md
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func
from datetime import datetime, timedelta
from app.crud.base import CRUDBase
from app.models.interview import Interview
from app.schemas.interview import InterviewCreate, InterviewUpdate


class CRUDInterview(CRUDBase[Interview, InterviewCreate, InterviewUpdate]):
    def get_with_candidate(self, db: Session, id: int) -> Optional[Interview]:
        """Get interview with candidate information"""
        return (
            db.query(Interview)
            .options(joinedload(Interview.candidate))
            .filter(Interview.id == id)
            .first()
        )
    
    def get_multi_with_candidates(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100,
        search: Optional[str] = None
    ) -> List[Interview]:
        """Get interviews with candidate information and optional search"""
        query = (
            db.query(Interview)
            .options(joinedload(Interview.candidate))
            .join(Interview.candidate)
        )
        
        if search:
            search_filter = or_(
                Interview.interviewer_name.ilike(f"%{search}%"),
                Interview.interview_type.ilike(f"%{search}%"),
                Interview.candidate.has(full_name=search)
            )
            query = query.filter(search_filter)
        
        return (
            query
            .order_by(Interview.scheduled_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_upcoming_interviews(
        self, db: Session, *, days_ahead: int = 7, limit: int = 10
    ) -> List[Interview]:
        """Get upcoming interviews within specified days"""
        end_date = datetime.utcnow() + timedelta(days=days_ahead)
        
        return (
            db.query(Interview)
            .options(joinedload(Interview.candidate))
            .filter(
                and_(
                    Interview.scheduled_at >= datetime.utcnow(),
                    Interview.scheduled_at <= end_date,
                    Interview.status == "scheduled"
                )
            )
            .order_by(Interview.scheduled_at.asc())
            .limit(limit)
            .all()
        )

    def count_by_status(self, db: Session) -> dict:
        """Get count of interviews by status"""
        from app.models.interview import InterviewStatus
        
        result = (
            db.query(Interview.status, func.count(Interview.id))
            .group_by(Interview.status)
            .all()
        )
        
        # Initialize all statuses with 0
        counts = {status.value: 0 for status in InterviewStatus}
        
        # Update with actual counts
        for status, count in result:
            counts[status.value] = count
            
        return counts


interview = CRUDInterview(Interview)
