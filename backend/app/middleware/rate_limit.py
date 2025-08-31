# AI-assisted: see ai-assist.md
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import redis
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Redis connection for distributed rate limiting (optional)
# Falls back to in-memory if Redis is not available
redis_client: Optional[redis.Redis] = None

try:
    redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
    redis_client.ping()  # Test connection
    logger.info("Connected to Redis for rate limiting")
except Exception as e:
    logger.warning(f"Redis not available, using in-memory rate limiting: {e}")
    redis_client = None

def get_client_ip(request: Request) -> str:
    """Get client IP address, handling proxies"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return get_remote_address(request)

# Create limiter instance
limiter = Limiter(
    key_func=get_client_ip,
    storage_uri="redis://localhost:6379" if redis_client else "memory://",
    default_limits=["1000/hour"]  # Default limit for all endpoints
)

# Custom rate limit exceeded handler
def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """Custom handler for rate limit exceeded"""
    client_ip = get_client_ip(request)
    logger.warning(f"Rate limit exceeded for IP: {client_ip}, endpoint: {request.url.path}")
    
    # Get retry_after if available, otherwise default to 60 seconds
    retry_after = getattr(exc, 'retry_after', 60)
    
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": f"Too many requests. Limit: {exc.detail}",
            "retry_after": retry_after
        },
        headers={"Retry-After": str(retry_after)}
    )

# Rate limit decorators for different scenarios
def auth_rate_limit():
    """Strict rate limiting for authentication endpoints"""
    return limiter.limit("5/minute")

def api_rate_limit():
    """Standard rate limiting for API endpoints"""
    return limiter.limit("100/minute")

def upload_rate_limit():
    """Rate limiting for file upload endpoints"""
    return limiter.limit("10/minute")

def search_rate_limit():
    """Rate limiting for search endpoints"""
    return limiter.limit("30/minute")
