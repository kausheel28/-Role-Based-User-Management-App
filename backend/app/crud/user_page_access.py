# AI-assisted: see ai-assist.md
from typing import Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.user_page_access import UserPageAccess, PageName
from app.schemas.user_page_access import UserPageAccessCreate, UserPageAccessUpdate


class CRUDUserPageAccess(CRUDBase[UserPageAccess, UserPageAccessCreate, UserPageAccessUpdate]):
    def get_by_user_and_page(
        self, db: Session, *, user_id: int, page_name: PageName
    ) -> Optional[UserPageAccess]:
        return (
            db.query(UserPageAccess)
            .filter(
                UserPageAccess.user_id == user_id,
                UserPageAccess.page_name == page_name
            )
            .first()
        )
    
    def set_user_page_access(
        self, db: Session, *, user_id: int, page_name: PageName, has_access: bool
    ) -> UserPageAccess:
        """Set or update user's access to a specific page"""
        existing = self.get_by_user_and_page(db, user_id=user_id, page_name=page_name)
        
        if existing:
            # Update existing record
            return self.update(
                db, db_obj=existing, obj_in=UserPageAccessUpdate(has_access=has_access)
            )
        else:
            # Create new record
            return self.create(
                db,
                obj_in=UserPageAccessCreate(
                    user_id=user_id, page_name=page_name, has_access=has_access
                )
            )


user_page_access = CRUDUserPageAccess(UserPageAccess)
