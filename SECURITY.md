# Security Documentation

## Overview

This document outlines the comprehensive security measures implemented in the User Management & Multi-Screen Admin App, including authentication, authorization, data protection, and security best practices.

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication System](#authentication-system)
3. [Authorization & Access Control](#authorization--access-control)
4. [Data Protection](#data-protection)
5. [API Security](#api-security)
6. [Frontend Security](#frontend-security)
7. [Infrastructure Security](#infrastructure-security)
8. [Security Monitoring](#security-monitoring)
9. [Compliance & Auditing](#compliance--auditing)
10. [Security Best Practices](#security-best-practices)

## Security Architecture

### Multi-Layer Security Model

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           🛡️ SECURITY ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────────┘

CLIENT LAYER (Browser Security)
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│ │   HTTPS/TLS     │  │  CORS Policy    │  │  CSP Headers    │  │XSS Protection│ │
│ │                 │  │                 │  │                 │  │             │ │
│ │ ✅ Encrypted    │  │ ✅ Origin       │  │ ✅ Script      │  │ ✅ Content  │ │
│ │    Transport    │  │    Validation   │  │    Sources      │  │    Sanitize │ │
│ │ ✅ Certificate  │  │ ✅ Preflight    │  │ ✅ Style       │  │ ✅ Output   │ │
│ │    Validation   │  │    Requests     │  │    Sources      │  │    Encoding │ │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
APPLICATION LAYER (Server Security)
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│ │ Authentication  │  │   JWT Tokens    │  │ CSRF Protection │  │Rate Limiting│ │
│ │                 │  │                 │  │                 │  │             │ │
│ │ ✅ Login        │  │ ✅ Access       │  │ ✅ Token        │  │ ✅ Request  │ │
│ │    Validation   │  │    30min TTL    │  │    Validation   │  │    Throttle │ │
│ │ ✅ Password     │  │ ✅ Refresh      │  │ ✅ SameSite     │  │ ✅ IP-based │ │
│ │    Hashing      │  │    7day TTL     │  │    Cookies      │  │    Limits   │ │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │                        INPUT VALIDATION                                     │ │
│ │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │ │
│ │ │ Pydantic Schema │  │ SQL Injection   │  │     Data Sanitization       │ │ │
│ │ │ Validation      │  │ Prevention      │  │     & Type Checking         │ │ │
│ │ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
AUTHORIZATION LAYER (Access Control)
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│ │Role-Based Access│  │ Page Permissions│  │API Endpoint     │  │Resource-Level│ │
│ │                 │  │                 │  │Guards           │  │Access       │ │
│ │ ✅ Admin        │  │ ✅ Dashboard    │  │ ✅ JWT Required │  │ ✅ User     │ │
│ │ ✅ Manager      │  │ ✅ Users        │  │ ✅ Role Check   │  │    Ownership│ │
│ │ ✅ Agent        │  │ ✅ Candidates   │  │ ✅ Permission   │  │ ✅ Data     │ │
│ │ ✅ Viewer       │  │ ✅ Interviews   │  │    Validation   │  │    Filtering│ │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │                      PERMISSION OVERRIDE SYSTEM                            │ │
│ │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │ │
│ │ │ Default Role    │  │ Individual User │  │     Real-time Updates       │ │ │
│ │ │ Permissions     │  │ Overrides       │  │     with Audit Logging      │ │ │
│ │ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
DATA LAYER (Database Security)
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│ │SQL Injection    │  │ Data Encryption │  │  Audit Logging  │  │Backup       │ │
│ │Prevention       │  │                 │  │                 │  │Security     │ │
│ │                 │  │ ✅ Password     │  │ ✅ All Actions  │  │             │ │
│ │ ✅ ORM Usage    │  │    Hashing      │  │    Tracked      │  │ ✅ Encrypted│ │
│ │ ✅ Parameterized│  │ ✅ Sensitive    │  │ ✅ User         │  │    Backups  │ │
│ │    Queries      │  │    Data         │  │    Attribution  │  │ ✅ Access   │ │
│ │ ✅ Input        │  │ ✅ At-Rest      │  │ ✅ Metadata     │  │    Control  │ │
│ │    Validation   │  │    Encryption   │  │    Capture      │  │ ✅ Retention│ │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

SECURITY FLOW
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            REQUEST SECURITY FLOW                               │
│                                                                                 │
│ 1. HTTPS/TLS ────► 2. CORS Check ────► 3. Rate Limit ────► 4. CSRF Token      │
│                                                                                 │
│ 5. JWT Validation ────► 6. Role Check ────► 7. Permission ────► 8. Data Access │
│                                                                                 │
│ 9. Input Validation ──► 10. SQL Safety ──► 11. Audit Log ──► 12. Response     │
│                                                                                 │
│ ❌ ANY STEP FAILS → 401/403 ERROR + AUDIT LOG + RATE LIMIT PENALTY            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Security Principles

1. **Defense in Depth**: Multiple security layers
2. **Least Privilege**: Minimal access rights
3. **Zero Trust**: Verify every request
4. **Fail Secure**: Secure defaults
5. **Security by Design**: Built-in security

## Authentication System

### JWT Token Architecture

#### Access Tokens
- **Lifetime**: 30 minutes
- **Storage**: Memory (React state)
- **Purpose**: API authentication
- **Claims**: User ID, role, expiration
- **Algorithm**: HS256 (HMAC with SHA-256)

#### Refresh Tokens
- **Lifetime**: 7 days
- **Storage**: HttpOnly cookies
- **Purpose**: Token renewal
- **Rotation**: New token on each refresh
- **Security**: Secure, SameSite=Lax

### Token Implementation

#### Backend Token Generation
```python
def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def create_refresh_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt
```

#### Frontend Token Management
```typescript
// Token storage and management
export const setAccessToken = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  localStorage.setItem('access_token', token);
};

export const clearAccessToken = () => {
  delete api.defaults.headers.common['Authorization'];
  localStorage.removeItem('access_token');
  sessionStorage.removeItem('access_token');
};

// Automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const response = await api.post('/auth/refresh');
        const tokens = response.data;
        setAccessToken(tokens.access_token);
        return api(error.config);
      } catch (refreshError) {
        clearAccessToken();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### Password Security

#### Password Hashing
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

#### Password Requirements
- **Minimum length**: 8 characters
- **Complexity**: Mixed case, numbers, special characters
- **Validation**: Client and server-side validation
- **History**: Prevent password reuse (configurable)

### Session Management

#### Session Security
- **Secure cookies**: HttpOnly, Secure, SameSite
- **Session timeout**: Automatic logout after inactivity
- **Concurrent sessions**: Configurable session limits
- **Session invalidation**: Proper cleanup on logout

## Authorization & Access Control

### Role-Based Access Control (RBAC)

#### User Roles
```python
class UserRole(str, enum.Enum):
    ADMIN = "admin"      # Full system access
    MANAGER = "manager"  # Management operations
    AGENT = "agent"      # Limited operations
    VIEWER = "viewer"    # Read-only access
```

#### Default Permissions Matrix
| Role | Dashboard | Interviews | Candidates | Calls | Settings | User Mgmt |
|------|-----------|------------|------------|-------|----------|-----------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Agent | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |

### Page-Level Permissions

#### Permission Override System
```python
# Database model for per-user overrides
class UserPageAccess(Base):
    __tablename__ = "user_page_access"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    page_name = Column(Enum(PageName), nullable=False)
    has_access = Column(Boolean, nullable=False)
```

#### Permission Evaluation
```python
def has_page_access(db: Session, user: User, page: PageName) -> bool:
    # Check for explicit override first
    override = db.query(UserPageAccess).filter(
        UserPageAccess.user_id == user.id,
        UserPageAccess.page_name == page
    ).first()
    
    if override:
        return override.has_access
    
    # Fall back to role-based defaults
    return get_default_role_permissions(user.role).get(page.value, False)
```

### API Endpoint Protection

#### Authentication Dependency
```python
def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    token = credentials.credentials
    user_id = verify_token(token)
    
    if user_id is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = crud_user.get(db, id=int(user_id))
    if not user or not crud_user.is_active(user):
        raise HTTPException(status_code=401, detail="Inactive user")
    
    return user
```

#### Permission Dependency
```python
def check_page_access(page: PageName):
    def permission_dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        if not has_page_access(db, current_user, page):
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied to {page.value}"
            )
        return current_user
    
    return permission_dependency
```

### Frontend Route Protection

#### Protected Route Component
```typescript
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPage 
}) => {
  const { isAuthenticated, isLoading, permissions } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check page-specific permissions
  if (requiredPage && !permissions[requiredPage]) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

## Data Protection

### Encryption

#### Data at Rest
- **Database encryption**: PostgreSQL TDE (Transparent Data Encryption)
- **File encryption**: AES-256 for sensitive files
- **Backup encryption**: Encrypted backup storage
- **Key management**: Secure key rotation and storage

#### Data in Transit
- **HTTPS/TLS 1.3**: All client-server communication
- **Certificate management**: Automated certificate renewal
- **HSTS headers**: HTTP Strict Transport Security
- **Certificate pinning**: Additional protection against MITM

### Sensitive Data Handling

#### Password Storage
```python
# Never store plain text passwords
password_hash = get_password_hash(plain_password)
user.password_hash = password_hash
```

#### PII Protection
- **Data minimization**: Collect only necessary data
- **Anonymization**: Remove identifying information where possible
- **Retention policies**: Automatic data cleanup
- **Access logging**: Track access to sensitive data

### Database Security

#### SQL Injection Prevention
```python
# Always use parameterized queries
users = db.query(User).filter(User.email == email).all()

# Never use string concatenation
# BAD: f"SELECT * FROM users WHERE email = '{email}'"
```

#### Connection Security
- **SSL connections**: Encrypted database connections
- **Connection pooling**: Secure connection management
- **Least privilege**: Database user permissions
- **Network isolation**: Database in private network

## API Security

### Input Validation

#### Pydantic Schemas
```python
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8, max_length=100)
    role: UserRole = UserRole.VIEWER
    
    @validator('password')
    def validate_password(cls, v):
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)', v):
            raise ValueError('Password must contain uppercase, lowercase, and digit')
        return v
```

#### Request Sanitization
```python
def sanitize_input(data: str) -> str:
    # Remove potentially dangerous characters
    return bleach.clean(data, tags=[], strip=True)
```

### CSRF Protection

#### Token Generation
```python
import hmac
import hashlib
import secrets

class CSRFProtection:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key.encode()
    
    def generate_token(self, session_id: str) -> str:
        timestamp = str(int(time.time()))
        token_data = f"{session_id}:{timestamp}"
        signature = hmac.new(
            self.secret_key, 
            token_data.encode(), 
            hashlib.sha256
        ).hexdigest()
        return f"{token_data}:{signature}"
    
    def validate_token(self, token: str, session_id: str) -> bool:
        try:
            token_session, timestamp, signature = token.split(':')
            if token_session != session_id:
                return False
            
            # Verify signature
            expected_signature = hmac.new(
                self.secret_key,
                f"{token_session}:{timestamp}".encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
        except ValueError:
            return False
```

### Rate Limiting

#### Implementation
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, ...):
    # Login implementation
```

#### Rate Limit Configuration
- **Authentication endpoints**: 5 requests/minute
- **API endpoints**: 100 requests/minute
- **User creation**: 10 requests/hour
- **Password reset**: 3 requests/hour

### Error Handling

#### Secure Error Responses
```python
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Don't leak internal information
    if exc.status_code == 500:
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
```

## Frontend Security

### Content Security Policy (CSP)

#### CSP Headers
```python
def add_security_headers(response: Response) -> Response:
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none'"
    )
    return response
```

### XSS Protection

#### Input Sanitization
```typescript
// Sanitize user input before display
const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  });
};
```

#### Output Encoding
```typescript
// Always encode output in JSX
const UserProfile = ({ user }: { user: User }) => (
  <div>
    <h1>{user.full_name}</h1> {/* React automatically encodes */}
    <div dangerouslySetInnerHTML={{ 
      __html: sanitizeHtml(user.bio) 
    }} />
  </div>
);
```

### Client-Side Security

#### Token Storage
```typescript
// Secure token storage practices
const AuthContext = () => {
  // Access tokens in memory (not localStorage for security)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  // Refresh tokens in httpOnly cookies (handled by backend)
  // Never store refresh tokens in localStorage
};
```

#### Route Security
```typescript
// Prevent unauthorized access
const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user, permissions } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (requiredPermission && !permissions[requiredPermission]) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};
```

## Infrastructure Security

### Network Security

#### HTTPS Configuration
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### Container Security

#### Docker Security
```dockerfile
# Use non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy files with proper ownership
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
```

#### Security Scanning
```yaml
# GitHub Actions security scanning
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'myapp:latest'
    format: 'sarif'
    output: 'trivy-results.sarif'
```

### Environment Security

#### Secrets Management
```bash
# Use environment variables for secrets
export SECRET_KEY=$(openssl rand -hex 32)
export DATABASE_URL="postgresql://user:pass@host:port/db"

# Never commit secrets to version control
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
```

#### Configuration Security
```python
class Settings(BaseSettings):
    secret_key: str = Field(..., min_length=32)
    database_url: str = Field(..., regex=r'^postgresql://')
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        
        @validator('secret_key')
        def validate_secret_key(cls, v):
            if len(v) < 32:
                raise ValueError('Secret key must be at least 32 characters')
            return v
```

## Security Monitoring

### Logging & Monitoring

#### Security Event Logging
```python
import logging

security_logger = logging.getLogger('security')

def log_security_event(event_type: str, user_id: int, details: dict):
    security_logger.warning(json.dumps({
        'event_type': event_type,
        'user_id': user_id,
        'details': details,
        'timestamp': datetime.utcnow().isoformat(),
        'ip_address': request.remote_addr
    }))
```

#### Failed Login Monitoring
```python
@router.post("/login")
def login(request: Request, credentials: LoginRequest):
    user = authenticate_user(credentials.email, credentials.password)
    
    if not user:
        log_security_event('failed_login', None, {
            'email': credentials.email,
            'ip_address': request.client.host
        })
        raise HTTPException(status_code=401, detail="Invalid credentials")
```

### Intrusion Detection

#### Suspicious Activity Detection
- **Multiple failed logins**: Account lockout after 5 attempts
- **Unusual access patterns**: Geographic anomalies
- **Privilege escalation attempts**: Unauthorized role changes
- **Data exfiltration**: Large data downloads

#### Automated Response
```python
def check_suspicious_activity(user_id: int, action: str):
    recent_attempts = get_recent_failed_logins(user_id, minutes=15)
    
    if len(recent_attempts) >= 5:
        lock_account(user_id, duration_minutes=30)
        send_security_alert(user_id, 'account_locked')
        
    if is_unusual_access_pattern(user_id, action):
        require_additional_authentication(user_id)
```

### Security Metrics

#### Key Security Indicators
- **Authentication success rate**: > 95%
- **Failed login attempts**: < 5% of total logins
- **Session timeout compliance**: 100%
- **Password policy compliance**: 100%
- **Security patch application**: < 24 hours

## Compliance & Auditing

### Audit Logging

#### Comprehensive Audit Trail
```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True)
    actor_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String, nullable=False)
    target = Column(String, nullable=False)
    metadata = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String)
    user_agent = Column(String)
```

#### Audit Event Types
- **Authentication**: login, logout, password_change
- **User management**: create_user, update_user, delete_user
- **Permission changes**: grant_permission, revoke_permission
- **Data operations**: create, read, update, delete
- **System events**: configuration_change, backup_created

### Data Privacy

#### GDPR Compliance
- **Data minimization**: Collect only necessary data
- **Right to access**: User data export functionality
- **Right to rectification**: Data correction capabilities
- **Right to erasure**: Data deletion on request
- **Data portability**: Structured data export

#### Privacy by Design
- **Default privacy settings**: Minimal data collection
- **Anonymization**: Remove PII where possible
- **Consent management**: Clear consent mechanisms
- **Data retention**: Automatic data cleanup

### Compliance Reporting

#### Security Reports
```python
def generate_security_report(start_date: date, end_date: date):
    return {
        'failed_logins': count_failed_logins(start_date, end_date),
        'successful_logins': count_successful_logins(start_date, end_date),
        'password_changes': count_password_changes(start_date, end_date),
        'permission_changes': count_permission_changes(start_date, end_date),
        'security_incidents': get_security_incidents(start_date, end_date)
    }
```

## Security Best Practices

### Development Security

#### Secure Coding Practices
1. **Input validation**: Validate all user inputs
2. **Output encoding**: Encode all outputs
3. **Parameterized queries**: Prevent SQL injection
4. **Error handling**: Don't leak sensitive information
5. **Dependency management**: Keep dependencies updated

#### Security Testing
```bash
# Static analysis
bandit -r backend/
eslint frontend/src --ext .ts,.tsx

# Dependency scanning
pip-audit
npm audit

# Dynamic testing
pytest tests/security/
npm run test:security
```

### Operational Security

#### Security Maintenance
1. **Regular updates**: Apply security patches promptly
2. **Vulnerability scanning**: Automated security scans
3. **Penetration testing**: Quarterly security assessments
4. **Security reviews**: Code and architecture reviews
5. **Incident response**: Documented response procedures

#### Security Training
- **Secure development**: Developer security training
- **Threat awareness**: Security threat education
- **Incident response**: Response procedure training
- **Compliance**: Regulatory requirement training

### Emergency Procedures

#### Security Incident Response
1. **Detection**: Identify security incidents
2. **Containment**: Limit incident impact
3. **Investigation**: Determine incident scope
4. **Remediation**: Fix security vulnerabilities
5. **Recovery**: Restore normal operations
6. **Lessons learned**: Improve security measures

#### Breach Response Plan
```python
def security_breach_response(incident_type: str, severity: str):
    # Immediate containment
    if severity == 'critical':
        disable_affected_accounts()
        revoke_active_sessions()
        
    # Notification
    notify_security_team(incident_type, severity)
    
    if severity in ['high', 'critical']:
        notify_management(incident_type, severity)
        
    # Documentation
    create_incident_report(incident_type, severity)
    
    # Investigation
    preserve_evidence()
    start_forensic_analysis()
```

---

*This security documentation should be reviewed and updated regularly to address new threats and security requirements.*
