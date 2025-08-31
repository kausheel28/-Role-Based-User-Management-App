# AI-assisted: see ai-assist.md
from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, candidates, interviews, calls, audit_logs

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["candidates"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["interviews"])
api_router.include_router(calls.router, prefix="/calls", tags=["calls"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
