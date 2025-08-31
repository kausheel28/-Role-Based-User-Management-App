# AI-assisted: see ai-assist.md
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from app.api.v1.api import api_router
from app.core.config import settings
from app.middleware import limiter, custom_rate_limit_handler, init_csrf_protection, SecurityHeadersMiddleware

app = FastAPI(
    title=settings.app_name,
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)

# Initialize CSRF protection
init_csrf_protection(settings.secret_key)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "User Management API is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
