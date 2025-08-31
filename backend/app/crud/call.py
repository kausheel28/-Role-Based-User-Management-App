# AI-assisted: see ai-assist.md
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app.crud.base import CRUDBase
from app.models.call import Call, CallType, CallStatus
from app.schemas.call import CallCreate


class CRUDCall(CRUDBase[Call, CallCreate, CallCreate]):
    def search(
        self,
        db: Session,
        *,
        query: Optional[str] = None,
        call_type: Optional[CallType] = None,
        status: Optional[CallStatus] = None,
        is_important: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Call]:
        """Search calls with various filters"""
        db_query = db.query(Call)
        
        filters = []
        
        if query:
            search_filter = or_(
                Call.caller_name.ilike(f"%{query}%"),
                Call.caller_number.ilike(f"%{query}%"),
                Call.notes.ilike(f"%{query}%")
            )
            filters.append(search_filter)
        
        if call_type:
            filters.append(Call.call_type == call_type)
        
        if status:
            filters.append(Call.status == status)
        
        if is_important is not None:
            filters.append(Call.is_important == is_important)
        
        if filters:
            db_query = db_query.filter(and_(*filters))
        
        return (
            db_query
            .order_by(Call.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_stats(self, db: Session) -> dict:
        """Get call statistics"""
        total_calls = db.query(func.count(Call.id)).scalar()
        answered_calls = db.query(func.count(Call.id)).filter(Call.status == CallStatus.ANSWERED).scalar()
        missed_calls = db.query(func.count(Call.id)).filter(Call.status == CallStatus.MISSED).scalar()
        important_calls = db.query(func.count(Call.id)).filter(Call.is_important == True).scalar()
        
        # Calculate total duration for answered calls
        total_duration = (
            db.query(func.sum(Call.duration_seconds))
            .filter(Call.status == CallStatus.ANSWERED)
            .scalar() or 0
        )
        
        return {
            "total_calls": total_calls,
            "answered_calls": answered_calls,
            "missed_calls": missed_calls,
            "important_calls": important_calls,
            "total_duration_seconds": total_duration,
            "answer_rate": (answered_calls / total_calls * 100) if total_calls > 0 else 0
        }


call = CRUDCall(Call)
