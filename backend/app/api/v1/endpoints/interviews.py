# AI-assisted: see ai-assist.md
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.crud.interview import CRUDInterview
from app.crud.audit_log import CRUDAuditLog
from app.db.session import get_db
from app.models.user import User
from app.models.user_page_access import PageName
from app.models.interview import Interview as InterviewModel
from app.models.audit_log import AuditLog as AuditLogModel
from app.schemas.interview import Interview, InterviewCreate, InterviewUpdate
from app.schemas.audit_log import AuditLogCreate

router = APIRouter()

# Instantiate CRUD objects
crud_interview = CRUDInterview(InterviewModel)
crud_audit_log = CRUDAuditLog(AuditLogModel)


@router.get("/", response_model=List[Interview])
def read_interviews(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=100, lte=100),
    search: Optional[str] = Query(None, description="Search by interviewer name, type, or candidate"),
    current_user: User = Depends(deps.check_page_access(PageName.INTERVIEWS)),
) -> Any:
    """
    Retrieve interviews with optional search.
    """
    interviews = crud_interview.get_multi_with_candidates(
        db, skip=skip, limit=limit, search=search
    )

    result = []
    for interview in interviews:
        result.append({
            "id": interview.id,
            "candidate_id": interview.candidate_id,
            "interviewer_name": interview.interviewer_name,
            "scheduled_at": interview.scheduled_at,
            "duration_minutes": interview.duration_minutes,
            "status": interview.status,
            "interview_type": interview.interview_type,
            "notes": interview.notes,
            "score": interview.score,
            "created_at": interview.created_at,
            "updated_at": interview.updated_at,
            "candidate_name": interview.candidate.full_name if interview.candidate else None
        })

    return result


@router.post("/", response_model=Interview)
def create_interview(
    *,
    db: Session = Depends(get_db),
    interview_in: InterviewCreate,
    current_user: User = Depends(deps.check_page_access(PageName.INTERVIEWS)),
) -> Any:
    """
    Create new interview.
    """
    interview = crud_interview.create(db, obj_in=interview_in)

    candidate_name = interview.candidate.full_name if interview.candidate else "Unknown"

    audit_log_data = AuditLogCreate(
        actor_id=current_user.id,
        action="create_interview",
        target=f"interview:{interview.id}",
        metadata={
            "candidate_id": interview.candidate_id,
            "candidate_name": candidate_name,
            "interviewer_name": interview.interviewer_name,
            "scheduled_at": interview.scheduled_at.isoformat(),
            "interview_type": interview.interview_type
        }
    )
    crud_audit_log.create(db, obj_in=audit_log_data)

    return interview


@router.get("/upcoming")
def get_upcoming_interviews(
    db: Session = Depends(get_db),
    days_ahead: int = Query(default=7, description="Number of days ahead to look"),
    limit: int = Query(default=10, lte=50),
    current_user: User = Depends(deps.check_page_access(PageName.INTERVIEWS)),
) -> Any:
    """
    Get upcoming interviews.
    """
    interviews = crud_interview.get_upcoming_interviews(db, days_ahead=days_ahead, limit=limit)

    result = []
    for interview in interviews:
        result.append({
            "id": interview.id,
            "candidate_id": interview.candidate_id,
            "candidate_name": interview.candidate.full_name if interview.candidate else None,
            "interviewer_name": interview.interviewer_name,
            "scheduled_at": interview.scheduled_at,
            "duration_minutes": interview.duration_minutes,
            "interview_type": interview.interview_type,
            "status": interview.status
        })

    return result


@router.get("/{interview_id}", response_model=Interview)
def read_interview(
    *,
    db: Session = Depends(get_db),
    interview_id: int,
    current_user: User = Depends(deps.check_page_access(PageName.INTERVIEWS)),
) -> Any:
    """
    Get interview by ID.
    """
    interview = crud_interview.get_with_candidate(db, id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    return {
        "id": interview.id,
        "candidate_id": interview.candidate_id,
        "interviewer_name": interview.interviewer_name,
        "scheduled_at": interview.scheduled_at,
        "duration_minutes": interview.duration_minutes,
        "status": interview.status,
        "interview_type": interview.interview_type,
        "notes": interview.notes,
        "score": interview.score,
        "created_at": interview.created_at,
        "updated_at": interview.updated_at,
        "candidate_name": interview.candidate.full_name if interview.candidate else None
    }


@router.put("/{interview_id}", response_model=Interview)
def update_interview(
    *,
    db: Session = Depends(get_db),
    interview_id: int,
    interview_in: InterviewUpdate,
    current_user: User = Depends(deps.check_page_access(PageName.INTERVIEWS)),
) -> Any:
    """
    Update an existing interview.
    """
    interview = crud_interview.get(db, id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    original_values = {
        "interviewer_name": interview.interviewer_name,
        "scheduled_at": interview.scheduled_at.isoformat(),
        "duration_minutes": interview.duration_minutes,
        "status": interview.status.value,
        "interview_type": interview.interview_type,
        "notes": interview.notes,
        "score": interview.score
    }

    interview = crud_interview.update(db, db_obj=interview, obj_in=interview_in)

    changes = {}
    update_data = interview_in.dict(exclude_unset=True)
    for field, new_value in update_data.items():
        if field in original_values:
            if field == "scheduled_at":
                new_value_str = new_value.isoformat() if hasattr(new_value, 'isoformat') else str(new_value)
                if original_values[field] != new_value_str:
                    changes[field] = {"from": original_values[field], "to": new_value_str}
            elif field == "status":
                new_value_str = new_value.value if hasattr(new_value, 'value') else new_value
                if original_values[field] != new_value_str:
                    changes[field] = {"from": original_values[field], "to": new_value_str}
            elif original_values[field] != new_value:
                changes[field] = {"from": original_values[field], "to": new_value}

    if changes:
        audit_log_data = AuditLogCreate(
            actor_id=current_user.id,
            action="update_interview",
            target=f"interview:{interview.id}",
            metadata={
                "candidate_id": interview.candidate_id,
                "changes": changes
            }
        )
        crud_audit_log.create(db, obj_in=audit_log_data)

    return interview


@router.delete("/{interview_id}")
def delete_interview(
    *,
    db: Session = Depends(get_db),
    interview_id: int,
    current_user: User = Depends(deps.check_page_access(PageName.INTERVIEWS)),
) -> Any:
    """
    Delete an interview.
    """
    interview = crud_interview.get(db, id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    interview_info = {
        "candidate_id": interview.candidate_id,
        "interviewer_name": interview.interviewer_name,
        "scheduled_at": interview.scheduled_at.isoformat(),
        "interview_type": interview.interview_type,
        "status": interview.status.value
    }

    crud_interview.remove(db, id=interview_id)

    audit_log_data = AuditLogCreate(
        actor_id=current_user.id,
        action="delete_interview",
        target=f"interview:{interview_id}",
        metadata=interview_info
    )
    crud_audit_log.create(db, obj_in=audit_log_data)

    return {"message": "Interview deleted successfully"}


@router.get("/stats/overview")
def get_interview_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_page_access(PageName.INTERVIEWS)),
) -> Any:
    """
    Get interview statistics overview.
    """
    stats = crud_interview.count_by_status(db)
    total_interviews = sum(stats.values())

    return {
        "total_interviews": total_interviews,
        "by_status": stats
    }
