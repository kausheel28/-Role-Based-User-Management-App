# AI-assisted: see ai-assist.md
from pydantic_settings import BaseSettings
from typing import List
import os

class SecuritySettings(BaseSettings):
    """Security configuration settings"""
    
    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_storage: str = "memory://"  # Use "redis://localhost:6379" for production
    default_rate_limit: str = "1000/hour"
    auth_rate_limit: str = "5/minute"
    api_rate_limit: str = "100/minute"
    
    # CSRF Protection
    csrf_enabled: bool = True
    csrf_cookie_secure: bool = False  # Set to True in production with HTTPS
    csrf_cookie_samesite: str = "strict"
    
    # Session Security
    session_cookie_secure: bool = False  # Set to True in production with HTTPS
    session_cookie_httponly: bool = True
    session_cookie_samesite: str = "lax"
    
    # CORS Settings
    cors_allow_credentials: bool = True
    cors_allow_origins: List[str] = ["http://localhost:3000"]
    cors_allow_methods: List[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    cors_allow_headers: List[str] = ["*"]
    
    # Security Headers
    security_headers_enabled: bool = True
    hsts_max_age: int = 31536000  # 1 year
    content_security_policy: str = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
    
    # Password Policy
    min_password_length: int = 8
    require_password_complexity: bool = True
    password_history_count: int = 5  # Number of previous passwords to remember
    
    # Account Security
    max_login_attempts: int = 5
    account_lockout_duration: int = 900  # 15 minutes in seconds
    session_timeout: int = 1800  # 30 minutes in seconds
    
    # Audit and Monitoring
    audit_failed_logins: bool = True
    audit_admin_actions: bool = True
    log_security_events: bool = True
    
    class Config:
        env_file = ".env"
        env_prefix = "SECURITY_"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from environment

# Production security settings
class ProductionSecuritySettings(SecuritySettings):
    """Production-specific security settings"""
    
    # Override for production
    rate_limit_storage: str = "redis://localhost:6379"
    csrf_cookie_secure: bool = True
    session_cookie_secure: bool = True
    cors_allow_origins: List[str] = []  # Must be set explicitly in production
    
    # Stricter production settings
    auth_rate_limit: str = "3/minute"
    max_login_attempts: int = 3
    account_lockout_duration: int = 1800  # 30 minutes
    
    # Enhanced security headers for production
    content_security_policy: str = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )

def get_security_settings() -> SecuritySettings:
    """Get security settings based on environment"""
    env = os.getenv("ENVIRONMENT", "development").lower()
    
    if env == "production":
        return ProductionSecuritySettings()
    else:
        return SecuritySettings()

# Global security settings instance
security_settings = get_security_settings()
