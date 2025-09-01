# User Management & Multi-Screen Admin App

A comprehensive admin application with role-based access control, user management, and audit logging.

## 🎥 Video Walkthrough

**[📹 Watch the Complete Demo (Loom Video)](https://www.loom.com/share/d69c8107b9f44bfe914356c8748dca04?sid=2a256c59-6fee-48dd-b4fd-6d2adefc8915)**

This 8-minute walkthrough covers:
- Live application demonstration with all features
- Architecture deep dive with ASCII diagrams
- Security implementation and fixed issues
- AI assistance disclosure and validation approach

## Stack
- **Frontend**: React (TypeScript), React Router, React Query, Tailwind CSS
- **Backend**: FastAPI (Python), PostgreSQL, JWT Authentication
- **Infrastructure**: Docker Compose for local development

## Features

### Authentication & Authorization
- Email/password login with JWT tokens (access + refresh)
- Role-based access control (Admin, Manager, Agent, Viewer)
- Per-user page access overrides with live admin toggles
- Frontend route guards and backend API enforcement
- Automatic token refresh with secure cookie storage
- Unauthorized access redirects to proper error pages

### User Management
- Full CRUD operations for users with pagination and search
- Role assignment and status management
- Live page permission toggles (Admin-only)
- Role escalation prevention (Managers cannot create Admins)
- Comprehensive audit logging with role-based filtering

### Application Pages
- **Dashboard**: Overview with statistics, recent activity, and upcoming interviews
- **Interviews**: Complete CRUD with scheduling, editing, status management, and filtering
- **Candidates**: Full candidate management with search, pagination, and form validation
- **Calls**: Complete call logging system with editing, filtering by type/status/importance
- **Settings**: User profile and password management
- **User Management**: Admin-only user and permission management with live controls

### Security Features
- JWT token-based authentication with refresh rotation
- Password hashing with bcrypt and strength requirements
- HMAC-based CSRF protection with session binding
- Rate limiting with Redis backend and in-memory fallback
- Comprehensive security headers (CSP, HSTS, X-Frame-Options, etc.)
- Input validation and sanitization across all endpoints
- Secure token storage practices with httpOnly cookies

### Audit & Compliance
- **Comprehensive Action Tracking**: 22+ different action types logged
- **Role-Based Log Access**: Admin sees all, Manager sees non-admin, Agent/Viewer see own
- **Detailed Metadata**: Before/after values, user attribution, timestamps
- **Enterprise Compliance**: Meets security and access control requirements

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Local Development with Docker

1. Clone the repository:
```bash
git clone <repository-url>
cd user-management-app
```

2. Start the application:
```bash
docker-compose up -d
```

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

**Note**: The application includes automatic database seeding with test users and sample data.

### Default Admin Credentials
- **Email**: admin@example.com
- **Password**: admin123

### Additional Test Users
- **Manager**: manager@example.com / manager123
- **Agent 1**: agent1@example.com / agent123
- **Agent 2**: agent2@example.com / agent123
- **Viewer**: viewer@example.com / viewer123

## Role-Based Access Control

### Default Role Permissions
- **Admin**: Full access to all pages and user management
- **Manager**: Access to Dashboard, Interviews, Candidates, Calls, Settings
- **Agent**: Access to Dashboard, Interviews, Calls, Settings
- **Viewer**: Access to Dashboard, Settings (read-only)

### Per-User Overrides
Admins can grant or revoke access to specific pages for individual users, overriding their default role permissions.

### Enforcement Points
- **Frontend**: Route guards prevent navigation to unauthorized pages
- **Backend**: API endpoints validate user permissions before processing requests
- **Database**: User permissions stored and validated server-side

## Development

### Local Setup Without Docker

See [SETUP_LOCAL.md](./SETUP_LOCAL.md) for detailed local development setup instructions.

#### Quick Local Setup
```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
copy env_local .env
alembic upgrade head
python seed_data.py
python -m uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend  
npm install
npm start
```

**Prerequisites for Local Setup**:
- PostgreSQL 15+ running locally (username: `postgres`, password: `root`)
- Python 3.11+
- Node.js 18+

**Database Configuration**:
- Database name: `user_management`
- Default connection: `postgresql://postgres:root@localhost:5432/user_management`

## API Documentation

The FastAPI backend automatically generates interactive API documentation available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Security Notes

### Token Storage
- Access tokens stored in memory (React state)
- Refresh tokens stored in httpOnly cookies
- Automatic token refresh on expiration

### Password Security
- Passwords hashed using bcrypt with salt rounds
- Password strength requirements enforced
- Password change requires current password verification

### API Security
- CORS configured for frontend origin only
- HMAC-based CSRF protection with session binding
- Rate limiting on authentication endpoints (with Redis/in-memory fallback)
- Comprehensive security headers (CSP, HSTS, X-Frame-Options, etc.)
- Input validation and sanitization across all endpoints
- Role-based API access control with page-level permissions

## 📚 Documentation

This project includes comprehensive documentation with **detailed ASCII diagrams** (no Mermaid dependencies) that are perfect for screen sharing and technical walkthroughs:

### 🏗️ [Architecture Documentation](./ARCHITECTURE.md)
Complete system architecture with clear visual diagrams:
- **Authentication Flow** - Session persistence, token refresh, and route protection
- **Permission System** - Role-based access with admin overrides
- **Component Hierarchy** - React component structure and routing
- **Database Schema** - Complete ERD with tables, relationships, and constraints
- **Deployment Architecture** - Development, production, and CI/CD options

### 🛡️ [Security Documentation](./SECURITY.md)
Multi-layer security model with implementation details:
- **Security Architecture** - Client, application, authorization, and data layers
- **JWT Authentication** - Access and refresh token management
- **Permission System** - RBAC with page-level controls
- **Protection Mechanisms** - CSRF, rate limiting, input validation

### 🧪 [Testing Documentation](./TESTING.md)
Comprehensive testing strategy and implementation:
- **Testing Pyramid** - Unit (75%), Integration (20%), E2E (5%)
- **Backend Testing** - pytest with fixtures and mocking
- **Frontend Testing** - Jest with React Testing Library
- **Security Testing** - Authentication and authorization tests

### 🚀 [Deployment Documentation](./DEPLOYMENT.md)
Complete deployment guide and environment setup:
- **Local Development** - Docker Compose and native setup
- **Production Options** - Vercel, Railway, AWS with pros/cons
- **CI/CD Pipeline** - GitHub Actions with quality gates
- **Environment Configuration** - Variables and secrets management

### 📖 [Documentation Index](./docs/README.md)
Navigation hub for all project documentation with quick reference links.

> **✅ Key Issues Resolved**: Session persistence on page refresh, debounced search in user management, interview status updates, and automatic token refresh - all documented with technical details in the architecture diagrams.

## Architecture Overview

### Database Schema
- `users`: User accounts with roles and status
- `user_page_access`: Per-user page permission overrides  
- `audit_logs`: Comprehensive action logging with metadata
- `candidates`: Candidate management with status tracking
- `interviews`: Interview scheduling with candidate relationships
- `calls`: Call logging with type, status, and importance flags

### Backend Structure
- FastAPI with dependency injection and middleware
- SQLAlchemy ORM with Alembic migrations
- JWT authentication with refresh token rotation
- Comprehensive audit logging across all operations
- Rate limiting and CSRF protection middleware
- Role-based access control with page-level permissions

### Frontend Structure
- React with TypeScript for type safety
- React Router for navigation with auth guards
- React Query for server state management
- Tailwind CSS for styling
- Form validation with react-hook-form

## Deployment

> **📖 For comprehensive deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)**

### Quick Environment Setup

#### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

#### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:8000
```

### Recommended Production Stack
- **Frontend**: Vercel (React build + CDN)
- **Backend**: Railway (FastAPI container + auto-scaling)  
- **Database**: Railway PostgreSQL (managed + backups)
- **CI/CD**: GitHub Actions (automated testing + deployment)

**Cost**: $0-20/month • **Scale**: 10k+ users • **Maintenance**: Minimal overhead

## Enterprise Compliance

This application has been thoroughly evaluated against enterprise security and functional requirements:

### ✅ **Security Compliance Status**
- **User Access Restrictions**: ✅ Complete API and frontend protection
- **Live Permission Toggles**: ✅ Real-time admin controls implemented  
- **Role Escalation Prevention**: ✅ Admin-only user management enforced
- **Pagination + Search**: ✅ Implemented across all major entities
- **Comprehensive Audit Logging**: ✅ 22+ action types with metadata tracking

### **Production-Ready Features**
- **15+ API Endpoints**: Full CRUD operations with proper validation
- **Multi-Layer Security**: CSRF, rate limiting, security headers
- **Role-Based Access**: Complete permission system with live controls
- **Audit Trail**: Comprehensive action tracking with role-based filtering
- **Responsive Design**: Mobile-friendly interface across all pages

## AI Usage Disclosure

This project was developed with extensive AI assistance (heavily AI-generated codebase). See [ai-assist.md](./ai-assist.md) for detailed documentation of AI-assisted development steps, prompts used, and validation approaches across 11 major development phases.

## License

MIT License - see LICENSE file for details.
