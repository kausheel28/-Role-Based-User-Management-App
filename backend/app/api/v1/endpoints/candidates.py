# AI-assisted: see ai-assist.md
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.crud.candidate import CRUDCandidate
from app.crud.audit_log import CRUDAuditLog
from app.db.session import get_db
from app.models.user import User
from app.models.user_page_access import PageName
from app.models.candidate import Candidate as CandidateModel
from app.models.audit_log import AuditLog as AuditLogModel
from app.schemas.candidate import Candidate, CandidateCreate, CandidateUpdate
from app.schemas.audit_log import AuditLogCreate

router = APIRouter()

# Instantiate CRUD objects
crud_candidate = CRUDCandidate(CandidateModel)
crud_audit_log = CRUDAuditLog(AuditLogModel)


@router.get("/", response_model=List[Candidate])
def read_candidates(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=100, lte=100),
    search: Optional[str] = Query(None, description="Search by name, email, or position"),
    current_user: User = Depends(deps.check_page_access(PageName.CANDIDATES)),
) -> Any:
    """
    Retrieve candidates with optional search.
    """
    if search:
        candidates = crud_candidate.search(db, query=search, skip=skip, limit=limit)
    else:
        candidates = crud_candidate.get_multi(db, skip=skip, limit=limit)
    return candidates


@router.post("/", response_model=Candidate)
def create_candidate(
    *,
    db: Session = Depends(get_db),
    candidate_in: CandidateCreate,
    current_user: User = Depends(deps.check_page_access(PageName.CANDIDATES)),
) -> Any:
    """
    Create new candidate.
    """
    candidate = crud_candidate.create(db, obj_in=candidate_in)
    
    # Log the candidate creation
    audit_log_data = AuditLogCreate(
        actor_id=current_user.id,
        action="create_candidate",
        target=f"candidate:{candidate.id}",
        metadata={
            "full_name": candidate.full_name,
            "email": candidate.email,
            "position": candidate.position,
            "status": candidate.status.value
        }
    )
    crud_audit_log.create(db, obj_in=audit_log_data)
    
    return candidate


@router.get("/{candidate_id}", response_model=Candidate)
def read_candidate(
    *,
    db: Session = Depends(get_db),
    candidate_id: int,
    current_user: User = Depends(deps.check_page_access(PageName.CANDIDATES)),
) -> Any:
    """
    Get candidate by ID.
    """
    candidate = crud_candidate.get(db, id=candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.put("/{candidate_id}", response_model=Candidate)
def update_candidate(
    *,
    db: Session = Depends(get_db),
    candidate_id: int,
    candidate_in: CandidateUpdate,
    current_user: User = Depends(deps.check_page_access(PageName.CANDIDATES)),
) -> Any:
    """
    Update an existing candidate.
    """
    candidate = crud_candidate.get(db, id=candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Store original values for audit log
    original_values = {
        "full_name": candidate.full_name,
        "email": candidate.email,
        "position": candidate.position,
        "status": candidate.status.value,
        "phone": candidate.phone,
        "resume_url": candidate.resume_url,
        "notes": candidate.notes
    }
    
    candidate = crud_candidate.update(db, db_obj=candidate, obj_in=candidate_in)
    
    # Log the candidate update
    changes = {}
    update_data = candidate_in.dict(exclude_unset=True)
    for field, new_value in update_data.items():
        if field in original_values and original_values[field] != new_value:
            if field == "status":
                changes[field] = {"from": original_values[field], "to": new_value.value if hasattr(new_value, 'value') else new_value}
            else:
                changes[field] = {"from": original_values[field], "to": new_value}
    
    if changes:
        audit_log_data = AuditLogCreate(
            actor_id=current_user.id,
            action="update_candidate",
            target=f"candidate:{candidate.id}",
            metadata={
                "candidate_name": candidate.full_name,
                "changes": changes
            }
        )
        crud_audit_log.create(db, obj_in=audit_log_data)
    
    return candidate


@router.delete("/{candidate_id}")
def delete_candidate(
    *,
    db: Session = Depends(get_db),
    candidate_id: int,
    current_user: User = Depends(deps.check_page_access(PageName.CANDIDATES)),
) -> Any:
    """
    Delete a candidate.
    """
    candidate = crud_candidate.get(db, id=candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Store candidate info for audit log before deletion
    candidate_info = {
        "full_name": candidate.full_name,
        "email": candidate.email,
        "position": candidate.position,
        "status": candidate.status.value
    }
    
    crud_candidate.remove(db, id=candidate_id)
    
    # Log the candidate deletion
    audit_log_data = AuditLogCreate(
        actor_id=current_user.id,
        action="delete_candidate",
        target=f"candidate:{candidate_id}",
        metadata=candidate_info
    )
    crud_audit_log.create(db, obj_in=audit_log_data)
    
    return {"message": "Candidate deleted successfully"}


@router.get("/stats/overview")
def get_candidate_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_page_access(PageName.CANDIDATES)),
) -> Any:
    """
    Get candidate statistics overview.
    """
    stats = crud_candidate.count_by_status(db)
    total_candidates = sum(stats.values())
    
    return {
        "total_candidates": total_candidates,
        "by_status": stats
    }
