# AI-assisted: see ai-assist.md
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.crud.call import CRUDCall
from app.crud.audit_log import CRUDAuditLog
from app.db.session import get_db
from app.models.user import User
from app.models.user_page_access import PageName
from app.models.call import Call as CallModel, CallType, CallStatus
from app.models.audit_log import AuditLog as AuditLogModel
from app.schemas.call import Call, CallCreate, CallUpdate
from app.schemas.audit_log import AuditLogCreate

router = APIRouter()

# Instantiate CRUD objects
crud_call = CRUDCall(CallModel)
crud_audit_log = CRUDAuditLog(AuditLogModel)


@router.get("/", response_model=List[Call])
def read_calls(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=100, lte=100),
    search: Optional[str] = Query(None, description="Search by caller name, number, or notes"),
    call_type: Optional[CallType] = Query(None, description="Filter by call type"),
    status: Optional[CallStatus] = Query(None, description="Filter by call status"),
    is_important: Optional[bool] = Query(None, description="Filter by importance"),
    current_user: User = Depends(deps.check_page_access(PageName.CALLS)),
) -> Any:
    """
    Retrieve calls with optional filters.
    """
    calls = crud_call.search(
        db,
        query=search,
        call_type=call_type,
        status=status,
        is_important=is_important,
        skip=skip,
        limit=limit
    )
    return calls


@router.post("/", response_model=Call)
def create_call(
    *,
    db: Session = Depends(get_db),
    call_in: CallCreate,
    current_user: User = Depends(deps.check_page_access(PageName.CALLS)),
) -> Any:
    """
    Create new call record.
    """
    call = crud_call.create(db, obj_in=call_in)
    
    # Log the call creation
    audit_log_data = AuditLogCreate(
        actor_id=current_user.id,
        action="create_call",
        target=f"call:{call.id}",
        metadata={
            "caller_name": call.caller_name,
            "caller_number": call.caller_number,
            "call_type": call.call_type.value,
            "status": call.status.value,
            "is_important": call.is_important
        }
    )
    crud_audit_log.create(db, obj_in=audit_log_data)
    
    return call


@router.get("/{call_id}", response_model=Call)
def read_call(
    *,
    db: Session = Depends(get_db),
    call_id: int,
    current_user: User = Depends(deps.check_page_access(PageName.CALLS)),
) -> Any:
    """
    Get call by ID.
    """
    call = crud_call.get(db, id=call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call


@router.put("/{call_id}", response_model=Call)
def update_call(
    *,
    db: Session = Depends(get_db),
    call_id: int,
    call_in: CallUpdate,
    current_user: User = Depends(deps.check_page_access(PageName.CALLS)),
) -> Any:
    """
    Update a call record.
    """
    call = crud_call.get(db, id=call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Store original call info for audit log
    original_info = {
        "caller_name": call.caller_name,
        "caller_number": call.caller_number,
        "call_type": call.call_type.value,
        "status": call.status.value,
        "duration_seconds": call.duration_seconds,
        "is_important": call.is_important,
        "notes": call.notes
    }
    
    # Update the call
    call = crud_call.update(db, db_obj=call, obj_in=call_in)
    
    # Prepare updated info for audit log
    updated_info = {
        "caller_name": call.caller_name,
        "caller_number": call.caller_number,
        "call_type": call.call_type.value,
        "status": call.status.value,
        "duration_seconds": call.duration_seconds,
        "is_important": call.is_important,
        "notes": call.notes
    }
    
    # Log the call update
    audit_log_data = AuditLogCreate(
        actor_id=current_user.id,
        action="update_call",
        target=f"call:{call_id}",
        metadata={
            "original": original_info,
            "updated": updated_info
        }
    )
    crud_audit_log.create(db, obj_in=audit_log_data)
    
    return call


@router.delete("/{call_id}")
def delete_call(
    *,
    db: Session = Depends(get_db),
    call_id: int,
    current_user: User = Depends(deps.check_page_access(PageName.CALLS)),
) -> Any:
    """
    Delete a call record.
    """
    call = crud_call.get(db, id=call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Store call info for audit log before deletion
    call_info = {
        "caller_name": call.caller_name,
        "caller_number": call.caller_number,
        "call_type": call.call_type.value,
        "status": call.status.value,
        "duration_seconds": call.duration_seconds,
        "is_important": call.is_important
    }
    
    crud_call.remove(db, id=call_id)
    
    # Log the call deletion
    audit_log_data = AuditLogCreate(
        actor_id=current_user.id,
        action="delete_call",
        target=f"call:{call_id}",
        metadata=call_info
    )
    crud_audit_log.create(db, obj_in=audit_log_data)
    
    return {"message": "Call deleted successfully"}


@router.get("/stats/overview")
def get_call_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_page_access(PageName.CALLS)),
) -> Any:
    """
    Get call statistics overview.
    """
    stats = crud_call.get_stats(db)
    return stats
