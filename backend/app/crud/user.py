# AI-assisted: see ai-assist.md
from typing import Any, Dict, Optional, Union, List
from sqlalchemy.orm import Session
from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User, UserRole
from app.models.user_page_access import UserPageAccess, PageName
from app.schemas.user import UserCreate, UserUpdate


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def __init__(self, model):
        super().__init__(model)

    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            full_name=obj_in.full_name,
            password_hash=get_password_hash(obj_in.password),
            role=obj_in.role,  # Ensure this is a UserRole enum
            active=obj_in.active,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, db: Session, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)

        if "password" in update_data:
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["password_hash"] = hashed_password

        return super().update(db, db_obj=db_obj, obj_in=update_data)

    def authenticate(self, db: Session, *, email: str, password: str) -> Optional[User]:
        user = self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    def is_active(self, user: User) -> bool:
        return user.active

    def get_user_permissions(self, db: Session, user: User) -> Dict[str, bool]:
        """Get user's page permissions including role defaults and overrides"""
        # Default permissions by role
        role_permissions = {
            UserRole.ADMIN: {
                PageName.DASHBOARD: True,
                PageName.INTERVIEWS: True,
                PageName.CANDIDATES: True,
                PageName.CALLS: True,
                PageName.SETTINGS: True,
                PageName.USER_MANAGEMENT: True,
            },
            UserRole.MANAGER: {
                PageName.DASHBOARD: True,
                PageName.INTERVIEWS: True,
                PageName.CANDIDATES: True,
                PageName.CALLS: True,
                PageName.SETTINGS: True,
                PageName.USER_MANAGEMENT: False,
            },
            UserRole.AGENT: {
                PageName.DASHBOARD: True,
                PageName.INTERVIEWS: True,
                PageName.CANDIDATES: False,
                PageName.CALLS: True,
                PageName.SETTINGS: True,
                PageName.USER_MANAGEMENT: False,
            },
            UserRole.VIEWER: {
                PageName.DASHBOARD: True,
                PageName.INTERVIEWS: False,
                PageName.CANDIDATES: False,
                PageName.CALLS: False,
                PageName.SETTINGS: True,
                PageName.USER_MANAGEMENT: False,
            },
        }

        permissions = role_permissions.get(user.role, {})

        # Apply user-specific overrides
        overrides = db.query(UserPageAccess).filter(UserPageAccess.user_id == user.id).all()
        for override in overrides:
            permissions[override.page_name] = override.has_access

        # Convert enum keys to strings for JSON serialization
        return {page.value: has_access for page, has_access in permissions.items()}

    def get_multi_with_permissions(
        self, db: Session, *, skip: int = 0, limit: int = 100, search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get multiple users with their permissions and optional search"""
        if search:
            # Search by full_name or email (case-insensitive)
            users = (
                db.query(User)
                .filter(
                    (User.full_name.ilike(f"%{search}%")) |
                    (User.email.ilike(f"%{search}%"))
                )
                .offset(skip)
                .limit(limit)
                .all()
            )
        else:
            users = self.get_multi(db, skip=skip, limit=limit)
        result = []
        for user in users:
            user_dict = {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.value if isinstance(user.role, UserRole) else user.role,
                "active": user.active,
                "created_at": user.created_at,
                "updated_at": user.updated_at,
                "page_permissions": self.get_user_permissions(db, user)
            }
            result.append(user_dict)
        return result


# Create a singleton instance to use elsewhere
user = CRUDUser(User)
