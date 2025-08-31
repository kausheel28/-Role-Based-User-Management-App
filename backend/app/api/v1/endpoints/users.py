from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.crud.user import CRUDUser
from app.crud.audit_log import CRUDAuditLog
from app.crud import user_page_access as crud_user_page_access
from app.db.session import get_db
from app.models.user import User
from app.models.user_page_access import PageName
from app.models.audit_log import AuditLog as AuditLogModel
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate, UserWithPermissions
from app.schemas.audit_log import AuditLogCreate

router = APIRouter()

# CRUD instances
crud_user = CRUDUser(User)
crud_audit_log = CRUDAuditLog(AuditLogModel)


@router.get("/", response_model=List[UserWithPermissions])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=100, lte=100),
    search: Optional[str] = Query(None, description="Search by name or email"),
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Retrieve users with optional search. Admin only.
    """
    return crud_user.get_multi_with_permissions(db, skip=skip, limit=limit, search=search)


@router.post("/", response_model=UserSchema)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Create new user. Admin only.
    """
    existing_user = crud_user.get_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists."
        )

    new_user = crud_user.create(db, obj_in=user_in)

    audit_data = AuditLogCreate(
        actor_id=current_user.id,
        action="create_user",
        target=f"user:{new_user.id}",
        target_user_id=new_user.id,
        metadata={
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role.value
        }
    )
    crud_audit_log.create(db, obj_in=audit_data)

    return new_user


@router.put("/{user_id}", response_model=UserSchema)
def update_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Update a user. Admin only.
    """
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    original_values = {
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "active": user.active
    }

    updated_user = crud_user.update(db, db_obj=user, obj_in=user_in)

    # Audit log for changes
    changes = {}
    update_data = user_in.dict(exclude_unset=True)
    for field, new_value in update_data.items():
        if field == "password":
            changes["password"] = "changed"
        elif field in original_values and original_values[field] != new_value:
            changes[field] = {"from": original_values[field], "to": new_value}

    if changes:
        audit_data = AuditLogCreate(
            actor_id=current_user.id,
            action="update_user",
            target=f"user:{updated_user.id}",
            target_user_id=updated_user.id,
            metadata={"changes": changes}
        )
        crud_audit_log.create(db, obj_in=audit_data)

    return updated_user


@router.get("/{user_id}", response_model=UserWithPermissions)
def read_user_by_id(
    user_id: int,
    current_user: User = Depends(deps.get_current_admin_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get a specific user by id. Admin only.
    """
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    permissions = crud_user.get_user_permissions(db, user)

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "active": user.active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "page_permissions": permissions
    }


@router.delete("/{user_id}")
def delete_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Delete a user. Admin only.
    """
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")

    user_info = {
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value
    }

    crud_user.remove(db, id=user_id)

    audit_data = AuditLogCreate(
        actor_id=current_user.id,
        action="delete_user",
        target=f"user:{user_id}",
        target_user_id=user_id,
        metadata=user_info
    )
    crud_audit_log.create(db, obj_in=audit_data)

    return {"message": "User deleted successfully"}


@router.put("/{user_id}/page-access/{page_name}")
def update_user_page_access(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    page_name: PageName,
    has_access: bool,
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Update user's access to a specific page. Admin only.
    """
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    current_permissions = crud_user.get_user_permissions(db, user)
    current_access = current_permissions.get(page_name.value, False)

    crud_user_page_access.set_user_page_access(
        db, user_id=user_id, page_name=page_name, has_access=has_access
    )

    if current_access != has_access:
        audit_data = AuditLogCreate(
            actor_id=current_user.id,
            action="update_page_access",
            target=f"user:{user_id}:page:{page_name.value}",
            target_user_id=user_id,
            metadata={
                "page": page_name.value,
                "access_granted": has_access,
                "previous_access": current_access
            }
        )
        crud_audit_log.create(db, obj_in=audit_data)

    return {"message": f"Page access updated for {page_name.value}"}


@router.get("/me/permissions")
def get_my_permissions(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user's page permissions.
    """
    permissions = crud_user.get_user_permissions(db, current_user)
    return {"permissions": permissions}
