# AI-assisted: see ai-assist.md
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.crud.base import CRUDBase
from app.models.candidate import Candidate
from app.schemas.candidate import CandidateCreate, CandidateUpdate


class CRUDCandidate(CRUDBase[Candidate, CandidateCreate, CandidateUpdate]):
    def search(
        self, 
        db: Session, 
        *, 
        query: Optional[str] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Candidate]:
        """Search candidates by name, email, or position"""
        db_query = db.query(Candidate)
        
        if query:
            search_filter = or_(
                Candidate.full_name.ilike(f"%{query}%"),
                Candidate.email.ilike(f"%{query}%"),
                Candidate.position.ilike(f"%{query}%")
            )
            db_query = db_query.filter(search_filter)
        
        return db_query.offset(skip).limit(limit).all()

    def count_by_status(self, db: Session) -> dict:
        """Get count of candidates by status"""
        from sqlalchemy import func
        from app.models.candidate import CandidateStatus
        
        result = (
            db.query(Candidate.status, func.count(Candidate.id))
            .group_by(Candidate.status)
            .all()
        )
        
        # Initialize all statuses with 0
        counts = {status.value: 0 for status in CandidateStatus}
        
        # Update with actual counts
        for status, count in result:
            counts[status.value] = count
            
        return counts


candidate = CRUDCandidate(Candidate)
