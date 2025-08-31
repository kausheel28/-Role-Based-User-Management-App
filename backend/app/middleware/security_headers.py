# AI-assisted: see ai-assist.md
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.security_config import security_settings
import logging

logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers to responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        if not security_settings.security_headers_enabled:
            return response
        
        # Add security headers
        self._add_security_headers(response)
        
        return response
    
    def _add_security_headers(self, response: Response) -> None:
        """Add security headers to the response"""
        
        # Content Security Policy
        if security_settings.content_security_policy:
            response.headers["Content-Security-Policy"] = security_settings.content_security_policy
        
        # HTTP Strict Transport Security (HSTS)
        if security_settings.session_cookie_secure:  # Only add HSTS if using HTTPS
            response.headers["Strict-Transport-Security"] = f"max-age={security_settings.hsts_max_age}; includeSubDomains"
        
        # X-Content-Type-Options
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # X-Frame-Options
        response.headers["X-Frame-Options"] = "DENY"
        
        # X-XSS-Protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy (formerly Feature Policy)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), "
            "payment=(), usb=(), magnetometer=(), gyroscope=(), "
            "accelerometer=(), ambient-light-sensor=(), autoplay=(), "
            "encrypted-media=(), fullscreen=(self), picture-in-picture=()"
        )
        
        # Remove server information
        if "Server" in response.headers:
            del response.headers["Server"]
        
        logger.debug("Added security headers to response")
