# AI-assisted: see ai-assist.md
import secrets
import hashlib
import hmac
from typing import Optional
from fastapi import Request, HTTPException, status
from fastapi.responses import Response
import logging

logger = logging.getLogger(__name__)

class CSRFProtection:
    def __init__(self, secret_key: str, cookie_name: str = "csrftoken", header_name: str = "X-CSRFToken"):
        self.secret_key = secret_key.encode()
        self.cookie_name = cookie_name
        self.header_name = header_name
        
    def generate_csrf_token(self, session_id: str) -> str:
        """Generate a CSRF token for the given session"""
        # Generate a random value
        random_value = secrets.token_urlsafe(32)
        
        # Create HMAC signature
        message = f"{session_id}:{random_value}".encode()
        signature = hmac.new(self.secret_key, message, hashlib.sha256).hexdigest()
        
        return f"{random_value}.{signature}"
    
    def verify_csrf_token(self, token: str, session_id: str) -> bool:
        """Verify a CSRF token"""
        try:
            if not token or '.' not in token:
                return False
                
            random_value, signature = token.rsplit('.', 1)
            
            # Recreate the expected signature
            message = f"{session_id}:{random_value}".encode()
            expected_signature = hmac.new(self.secret_key, message, hashlib.sha256).hexdigest()
            
            # Use constant-time comparison to prevent timing attacks
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            logger.warning(f"CSRF token verification failed: {e}")
            return False
    
    def set_csrf_cookie(self, response: Response, token: str) -> None:
        """Set CSRF token as a cookie"""
        response.set_cookie(
            key=self.cookie_name,
            value=token,
            httponly=False,  # JavaScript needs to read this for AJAX requests
            secure=False,    # Set to True in production with HTTPS
            samesite="strict"
        )
    
    def get_csrf_token_from_request(self, request: Request) -> Optional[str]:
        """Get CSRF token from request header or form data"""
        # Check header first
        token = request.headers.get(self.header_name)
        if token:
            return token
            
        # For form submissions, check form data
        # This would need to be handled in the endpoint if using form data
        return None
    
    def get_session_id(self, request: Request) -> str:
        """Get session ID from request (using user ID or session cookie)"""
        # Try to get from user context if available
        user = getattr(request.state, 'user', None)
        if user and hasattr(user, 'id'):
            return str(user.id)
            
        # Fallback to a combination of IP and User-Agent
        ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        return hashlib.md5(f"{ip}:{user_agent}".encode()).hexdigest()

# Global CSRF protection instance
csrf_protection: Optional[CSRFProtection] = None

def init_csrf_protection(secret_key: str) -> CSRFProtection:
    """Initialize CSRF protection with secret key"""
    global csrf_protection
    csrf_protection = CSRFProtection(secret_key)
    return csrf_protection

def require_csrf_token(request: Request) -> None:
    """Dependency to require CSRF token validation"""
    if not csrf_protection:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CSRF protection not initialized"
        )
    
    # Skip CSRF for safe methods
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        return
    
    # Get CSRF token from request
    csrf_token = csrf_protection.get_csrf_token_from_request(request)
    if not csrf_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing"
        )
    
    # Get session ID
    session_id = csrf_protection.get_session_id(request)
    
    # Verify token
    if not csrf_protection.verify_csrf_token(csrf_token, session_id):
        logger.warning(f"Invalid CSRF token from {request.client.host if request.client else 'unknown'}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token invalid"
        )

def get_csrf_token(request: Request) -> str:
    """Get a CSRF token for the current session"""
    if not csrf_protection:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CSRF protection not initialized"
        )
    
    session_id = csrf_protection.get_session_id(request)
    return csrf_protection.generate_csrf_token(session_id)
