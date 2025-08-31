# AI-assisted: see ai-assist.md
from pydantic import BaseModel
from datetime import datetime
from app.models.user_page_access import PageName


class UserPageAccessBase(BaseModel):
    page_name: PageName
    has_access: bool


class UserPageAccessCreate(UserPageAccessBase):
    user_id: int


class UserPageAccessUpdate(BaseModel):
    has_access: bool


class UserPageAccess(UserPageAccessBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime = None

    class Config:
        from_attributes = True
