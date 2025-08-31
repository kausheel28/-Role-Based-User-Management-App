# AI-assisted: see ai-assist.md
from sqlalchemy.orm import Session
from .base import SessionLocal


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
