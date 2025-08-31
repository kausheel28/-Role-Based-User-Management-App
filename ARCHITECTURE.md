# System Architecture Documentation

## Overview

This document provides comprehensive architectural documentation for the User Management & Multi-Screen Admin App, including system design, data flow, component hierarchy, and deployment strategies.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow & Authentication](#data-flow--authentication)
3. [Component Hierarchy](#component-hierarchy)
4. [Database Schema](#database-schema)
5. [Security & Permissions](#security--permissions)
6. [Deployment Architecture](#deployment-architecture)
7. [Technology Stack](#technology-stack)
8. [Design Patterns](#design-patterns)

## System Architecture

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         🏗️ SYSTEM ARCHITECTURE                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

FRONTEND (React + TypeScript)           BACKEND (FastAPI + Python)         DATABASE (PostgreSQL)
┌─────────────────────────┐              ┌─────────────────────────┐         ┌─────────────────┐
│      App.tsx            │              │    FastAPI Main App     │         │     users       │
│  ┌─────────────────────┐│              │ ┌─────────────────────┐ │         │ ┌─────────────┐ │
│  │   AuthProvider      ││              │ │  Middleware Layer   │ │         │ │ id, email,  │ │
│  │ ┌─────────────────┐ ││              │ │ ┌─────────────────┐ │ │         │ │ role, etc.  │ │
│  │ │  React Router   │ ││              │ │ │ CSRF Protection │ │ │         │ └─────────────┘ │
│  │ │ ┌─────────────┐ │ ││              │ │ │ Rate Limiting   │ │ │         │        │        │
│  │ │ │Protected    │ │ ││              │ │ │ Security Headers│ │ │         │        ▼        │
│  │ │ │Routes       │ │ ││              │ │ └─────────────────┘ │ │         │ ┌─────────────┐ │
│  │ │ └─────────────┘ │ ││              │ └─────────────────────┘ │         │ │user_page_   │ │
│  │ └─────────────────┘ ││              │           │             │         │ │access       │ │
│  └─────────────────────┘│              │           ▼             │         │ │(overrides)  │ │
│           │              │              │ ┌─────────────────────┐ │         │ └─────────────┘ │
│           ▼              │              │ │    API Router v1    │ │         │        │        │
│  ┌─────────────────────┐│              │ │ ┌─────────────────┐ │ │         │        ▼        │
│  │     Layout          ││              │ │ │ Auth Endpoints  │ │ │         │ ┌─────────────┐ │
│  │ ┌─────────────────┐ ││              │ │ │ Users Endpoints │ │ │         │ │ audit_logs  │ │
│  │ │ Dashboard Page  │ ││              │ │ │ Candidates EP   │ │ │         │ │ (tracking)  │ │
│  │ │ Users Page      │ ││              │ │ │ Interviews EP   │ │ │         │ └─────────────┘ │
│  │ │ Candidates Page │ ││              │ │ │ Calls Endpoints │ │ │         │                 │
│  │ │ Interviews Page │ ││              │ │ └─────────────────┘ │ │         │ ┌─────────────┐ │
│  │ │ Calls Page      │ ││              │ └─────────────────────┘ │         │ │ candidates  │ │
│  │ │ Settings Page   │ ││              │           │             │         │ │ interviews  │ │
│  │ └─────────────────┘ ││              │           ▼             │         │ │ calls       │ │
│  └─────────────────────┘│              │ ┌─────────────────────┐ │         │ │ (business)  │ │
│           │              │              │ │    CRUD Layer       │ │         │ └─────────────┘ │
│           ▼              │              │ │ ┌─────────────────┐ │ │         └─────────────────┘
│  ┌─────────────────────┐│              │ │ │ SQLAlchemy ORM  │ │ │
│  │   API Service       ││ ◄────────────┤ │ │ Database Models │ │ │
│  │ ┌─────────────────┐ ││   HTTPS/TLS  │ │ └─────────────────┘ │ │
│  │ │  React Query    │ ││   JWT Auth   │ └─────────────────────┘ │
│  │ │  State Mgmt     │ ││   API Calls  └─────────────────────────┘
│  │ └─────────────────┘ ││
│  └─────────────────────┘│
└─────────────────────────┘

SECURITY LAYERS (Applied Throughout)
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🔒 HTTPS/TLS → 🛡️ CORS → 🔑 JWT Auth → 🚫 CSRF → ⏱️ Rate Limit → 🔍 Validation │
└─────────────────────────────────────────────────────────────────────────────────┘

DATA FLOW PATTERN
┌─────────────┐    User Action    ┌─────────────┐    React Query   ┌─────────────┐
│   Browser   │ ─────────────────► │ Component   │ ────────────────► │ API Service │
└─────────────┘                   └─────────────┘                  └─────────────┘
       ▲                                                                    │
       │                                                                    ▼
┌─────────────┐    UI Update      ┌─────────────┐    HTTP Request  ┌─────────────┐
│ UI Changes  │ ◄─────────────────│ Cache Update│ ◄────────────────│   Backend   │
└─────────────┘                   └─────────────┘                  └─────────────┘
                                                                           │
                                                                           ▼
                                                                   ┌─────────────┐
                                                                   │  Database   │
                                                                   │   Query     │
                                                                   └─────────────┘
```

### Architecture Layers

#### 1. Presentation Layer (Frontend)
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6 with protected routes
- **State Management**: React Query for server state, Context API for auth
- **Styling**: Tailwind CSS with responsive design
- **Forms**: React Hook Form with validation

#### 2. API Layer (Backend)
- **Framework**: FastAPI with automatic OpenAPI documentation
- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control with page-level permissions
- **Validation**: Pydantic schemas for request/response validation
- **Security**: CSRF protection, rate limiting, security headers

#### 3. Data Layer (Database)
- **Database**: PostgreSQL with ACID compliance
- **ORM**: SQLAlchemy with Alembic migrations
- **Relationships**: Foreign keys with proper constraints
- **Indexing**: Optimized queries and performance

#### 4. Security Layer
- **Authentication**: JWT access tokens (30min) + refresh tokens (7 days)
- **Authorization**: Multi-level permission system
- **Protection**: CSRF, rate limiting, security headers, input validation
- **Audit**: Comprehensive logging of all user actions

## Data Flow & Authentication

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ✅ AUTHENTICATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────────────┘

1. USER LOGIN PROCESS
┌─────────────┐    POST /auth/login    ┌─────────────┐    Authenticate    ┌──────────┐
│   Browser   │ ──────────────────────► │   Backend   │ ─────────────────► │ Database │
│ (LoginPage) │                        │  FastAPI    │                    │PostgreSQL│
└─────────────┘                        └─────────────┘                    └──────────┘
       │                                       │
       │              JWT Tokens               │
       ◄───────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ setAccessToken(token) - STORES TOKEN    │  ✅ SOLUTION: Proper Token Storage
│ - api.defaults.headers['Authorization'] │     Sets Authorization header for API
│ - localStorage.setItem('access_token')  │     Persists token across page refreshes
│ - Refresh token → httpOnly cookie       │     Secure refresh token in cookie
└─────────────────────────────────────────┘

2. SESSION PERSISTENCE ON PAGE REFRESH
┌─────────────┐   Page Refresh    ┌─────────────┐   initializeAuth()   ┌─────────────┐
│   Browser   │ ─────────────────► │ AuthContext │ ─────────────────────► │ refreshUser()│
│             │   (F5 / Ctrl+R)   │             │   useEffect on mount  │             │
└─────────────┘                   └─────────────┘                       └─────────────┘
                                         │                                       │
                                         ▼                                       ▼
                                  ┌─────────────────┐                 ┌─────────────────┐
                                  │ Check localStorage│ ✅ TOKEN FOUND │ setAccessToken() │
                                  │ access_token    │ ──────────────► │ Restore headers │
                                  └─────────────────┘                 └─────────────────┘
                                         │                                       │
                                         ▼                                       ▼
                                  ┌─────────────────┐    GET /auth/me   ┌─────────────┐
                                  │ Call authApi    │ ─────────────────► │   Backend   │
                                  │ .getMe()        │                   │ Validates   │
                                  └─────────────────┘                   │ JWT Token   │
                                         │                               └─────────────┘
                                         │ ✅ 200 OK                            │
                                         ◄─────────────────────────────────────┘
                                         │ User Data + Permissions
                                         ▼
                                  ┌─────────────────┐
                                  │ setUser(data)   │ ✅ USER STAYS LOGGED IN
                                  │ setPermissions()│    No redirect to login!
                                  └─────────────────┘

3. PROTECTED ROUTE ACCESS
┌─────────────┐   Navigate to     ┌─────────────┐   Check Auth      ┌─────────────┐
│   Browser   │ ─────────────────► │ProtectedRoute│ ─────────────────► │ AuthContext │
│             │   /users          │             │                   │             │
└─────────────┘                   └─────────────┘                   └─────────────┘
                                         │                                   │
                                         ▼                                   ▼
                                  ┌─────────────────┐                ┌─────────────────┐
                                  │ isAuthenticated │ ◄──────────────│ isAuthenticated │
                                  │ = !!user        │                │ = !!user        │
                                  └─────────────────┘                └─────────────────┘
                                         │
                                         ▼
                              ┌─────────────────────────┐
                              │   PERMISSION CHECK      │
                              └─────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
        ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
        │ IF user = null  │    │IF !permissions  │    │IF permissions   │
        │ → /login        │    │[requiredPage]   │    │[requiredPage]   │
        │                 │    │ → /unauthorized │    │ → Show Content  │
        └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ✅ TOKEN REFRESH FLOW                                │
└─────────────────────────────────────────────────────────────────────────────────┘

1. API REQUEST WITH EXPIRED TOKEN
┌─────────────┐   API Request     ┌─────────────┐   JWT Verify      ┌─────────────┐
│  Frontend   │ ─────────────────► │   Backend   │ ─────────────────► │ JWT Library │
│ Component   │   Bearer token    │  FastAPI    │   Check expiry    │             │
└─────────────┘                   └─────────────┘                   └─────────────┘
       │                                 │                                 │
       │                                 │ ◄───────────────────────────────┘
       │                                 │ ❌ TOKEN EXPIRED
       │                                 ▼
       │                          ┌─────────────┐
       │              401 Error   │ Return 401  │
       │ ◄────────────────────────│ Unauthorized│
       │                          └─────────────┘
       ▼
┌─────────────┐
│ Axios       │ ✅ DETECTS 401 - TRIGGERS REFRESH
│ Interceptor │
└─────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        AUTOMATIC TOKEN REFRESH                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

2. REFRESH TOKEN REQUEST
┌─────────────┐   POST /auth/     ┌─────────────┐   Check Cookie    ┌─────────────┐
│ Interceptor │ ─────────────────► │   Backend   │ ─────────────────► │ HTTP Cookie │
│             │   refresh         │  FastAPI    │   refresh_token   │ (httpOnly)  │
└─────────────┘                   └─────────────┘                   └─────────────┘
       │                                 │                                 │
       │                                 │ ◄───────────────────────────────┘
       │                                 │ ✅ VALID REFRESH TOKEN
       │                                 ▼
       │                          ┌─────────────┐
       │                          │ Generate    │
       │                          │ New Tokens  │
       │                          └─────────────┘
       │                                 │
       │              New Tokens         ▼
       │ ◄────────────────────────┌─────────────┐
       │                          │ Return      │
       │                          │ access_token│
       │                          └─────────────┘
       ▼
┌─────────────┐
│ Update      │ ✅ STORES NEW TOKEN
│ Headers     │    setAccessToken(newToken)
│ + Storage   │    Updates Authorization header
└─────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         RETRY ORIGINAL REQUEST                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

3. RETRY WITH NEW TOKEN
┌─────────────┐   Retry Original  ┌─────────────┐   JWT Verify      ┌─────────────┐
│ Interceptor │ ─────────────────► │   Backend   │ ─────────────────► │ JWT Library │
│             │   Request +       │  FastAPI    │   New token       │             │
│             │   New Token       │             │                   │             │
└─────────────┘                   └─────────────┘                   └─────────────┘
       │                                 │                                 │
       │                                 │ ◄───────────────────────────────┘
       │                                 │ ✅ TOKEN VALID
       │                                 ▼
       │                          ┌─────────────┐
       │                          │ Process     │
       │                          │ Request     │
       │                          └─────────────┘
       │                                 │
       │              Success Data       ▼
       │ ◄────────────────────────┌─────────────┐
       │                          │ Return 200  │
       │                          │ + Data      │
       │                          └─────────────┘
       ▼
┌─────────────┐
│ Frontend    │ ✅ RECEIVES DATA - USER NEVER KNOWS TOKEN EXPIRED!
│ Component   │    Seamless experience, no login redirect
└─────────────┘

4. REFRESH TOKEN FAILURE (EXPIRED/INVALID)
┌─────────────┐   POST /auth/     ┌─────────────┐   Check Cookie    ┌─────────────┐
│ Interceptor │ ─────────────────► │   Backend   │ ─────────────────► │ HTTP Cookie │
│             │   refresh         │  FastAPI    │   refresh_token   │ (httpOnly)  │
└─────────────┘                   └─────────────┘                   └─────────────┘
       │                                 │                                 │
       │                                 │ ◄───────────────────────────────┘
       │                                 │ ❌ REFRESH TOKEN EXPIRED
       │                                 ▼
       │                          ┌─────────────┐
       │              401 Error   │ Return 401  │
       │ ◄────────────────────────│ Unauthorized│
       │                          └─────────────┘
       ▼
┌─────────────┐
│ Clear       │ ✅ CLEANUP & REDIRECT
│ Tokens      │    clearAccessToken()
│ + Redirect  │    window.location.href = '/login'
└─────────────┘
```

### Key Data Flow Patterns

1. **Request Flow**: User Action → Component → React Query → API Service → Backend → Database
2. **Response Flow**: Database → Backend → API Service → React Query Cache → Component → UI Update
3. **Error Handling**: Automatic retry, token refresh, user feedback
4. **State Management**: Server state (React Query) + Client state (React Context)

## Component Hierarchy

### React Component Structure

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          🧩 COMPONENT HIERARCHY                                │
└─────────────────────────────────────────────────────────────────────────────────┘

APP LEVEL PROVIDERS
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                App.tsx                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  AuthProvider   │  │QueryClientProvider│  │     Router      │  │   Toaster   │ │
│  │                 │  │                 │  │                 │  │             │ │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────┐ │ │
│  │ │AuthContext  │ │  │ │React Query  │ │  │ │   Routes    │ │  │ │Toast UI │ │ │
│  │ │- User State │ │  │ │- API Cache  │ │  │ │- Navigation │ │  │ │Messages │ │ │
│  │ │- Permissions│ │  │ │- Server     │ │  │ │- Guards     │ │  │ └─────────┘ │ │
│  │ │- Auth Funcs │ │  │ │  State Mgmt │ │  │ └─────────────┘ │  └─────────────┘ │
│  │ └─────────────┘ │  │ └─────────────┘ │  └─────────────────┘                  │
│  └─────────────────┘  └─────────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

ROUTING STRUCTURE
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ROUTES                                            │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│ /login          │ /dashboard      │ /users          │ /candidates             │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────────┐ │
│ │ LoginPage   │ │ │ProtectedRoute│ │ │ProtectedRoute│ │ │   ProtectedRoute    │ │
│ │- Login Form │ │ │     │       │ │ │     │       │ │ │         │           │ │
│ │- Validation │ │ │     ▼       │ │ │     ▼       │ │ │         ▼           │ │
│ └─────────────┘ │ │  Layout     │ │ │  Layout     │ │ │      Layout         │ │
│                 │ │     │       │ │ │     │       │ │ │         │           │ │
│                 │ │     ▼       │ │ │     ▼       │ │ │         ▼           │ │
│                 │ │DashboardPage│ │ │ UsersPage   │ │ │   CandidatesPage    │ │
│                 │ └─────────────┘ │ └─────────────┘ │ └─────────────────────┘ │
├─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤
│ /interviews     │ /calls          │ /settings       │ /unauthorized           │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────────┐ │
│ │ProtectedRoute│ │ │ProtectedRoute│ │ │ProtectedRoute│ │ │ UnauthorizedPage    │ │
│ │     │       │ │ │     │       │ │ │     │       │ │ │ - 403 Error         │ │
│ │     ▼       │ │ │     ▼       │ │ │     ▼       │ │ │ - Back Button       │ │
│ │  Layout     │ │ │  Layout     │ │ │  Layout     │ │ └─────────────────────┘ │
│ │     │       │ │ │     │       │ │ │     │       │ │                         │
│ │     ▼       │ │ │     ▼       │ │ │     ▼       │ │                         │
│ │InterviewsPage│ │ │ CallsPage   │ │ │SettingsPage │ │                         │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │                         │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────────┘

LAYOUT COMPONENT STRUCTURE
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                Layout                                           │
│ ┌─────────────────┐                              ┌─────────────────────────────┐ │
│ │ Sidebar Nav     │                              │     Main Content Area       │ │
│ │ ┌─────────────┐ │                              │ ┌─────────────────────────┐ │ │
│ │ │- Dashboard  │ │                              │ │      Page Content       │ │ │
│ │ │- Users      │ │                              │ │                         │ │ │
│ │ │- Candidates │ │                              │ │ ┌─────────────────────┐ │ │ │
│ │ │- Interviews │ │                              │ │ │   Specific Page     │ │ │ │
│ │ │- Calls      │ │                              │ │ │   Components        │ │ │ │
│ │ │- Settings   │ │                              │ │ └─────────────────────┘ │ │ │
│ │ └─────────────┘ │                              │ └─────────────────────────┘ │ │
│ └─────────────────┘                              └─────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │                            User Menu                                        │ │
│ │ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│ │ │Profile Info │  │Notifications│  │Theme Toggle │  │     Logout          │ │ │
│ │ └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

PAGE-SPECIFIC COMPONENTS
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           UsersPage Components                                 │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│ │User Mgmt Table  │ │Permission Toggle│ │  Add User Modal │ │ Edit User     │ │
│ │- Search/Filter  │ │- Live Updates   │ │  - Form Fields  │ │ Modal         │ │
│ │- Pagination     │ │- Role Matrix    │ │  - Validation   │ │ - Update Form │ │
│ │- Sort Controls  │ │- Audit Logging  │ │  - Role Select  │ │ - Save/Cancel │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ └───────────────┘ │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │                      Delete Confirmation Modal                             │ │
│ │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │ │
│ │ │Warning Message  │  │  Confirm Button │  │        Cancel Button        │ │ │
│ │ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DashboardPage Components                               │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────────────┐ │
│ │Statistics Cards │ │Recent Activity  │ │        Upcoming Interviews          │ │
│ │- Total Users    │ │- Audit Log Feed │ │ ┌─────────────────┐ ┌─────────────┐ │ │
│ │- Total Calls    │ │- User Actions   │ │ │Interview Item   │ │Time & Date  │ │ │
│ │- Interviews     │ │- Real-time      │ │ │- Candidate Name │ │- Interviewer│ │ │
│ │- Candidates     │ │  Updates        │ │ │- Position       │ │- Status     │ │ │
│ └─────────────────┘ └─────────────────┘ │ └─────────────────┘ └─────────────┘ │ │
│                                         └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

SHARED/REUSABLE COMPONENTS
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Shared Components                                   │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│ │  Modal Base     │ │  Form Controls  │ │  Table Base     │ │ Loading       │ │
│ │- Overlay        │ │- Input Fields   │ │- Headers        │ │ Spinner       │ │
│ │- Close Button   │ │- Validation     │ │- Pagination     │ │- Skeleton     │ │
│ │- ESC Handler    │ │- Error Display  │ │- Sort/Filter    │ │  States       │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Component Categories

#### 1. Core Components
- **App.tsx**: Root application component
- **AuthProvider**: Authentication context provider
- **Layout**: Main application layout with navigation

#### 2. Page Components
- **DashboardPage**: Overview with statistics and recent activity
- **UsersPage**: User management with permission controls
- **CandidatesPage**: Candidate CRUD operations
- **InterviewsPage**: Interview scheduling and management
- **CallsPage**: Call logging and tracking
- **SettingsPage**: User profile and system settings

#### 3. Shared Components
- **ProtectedRoute**: Route-level authentication guard
- **Modal Components**: Reusable modal dialogs
- **Form Components**: Validated form inputs
- **Table Components**: Data tables with sorting/filtering

#### 4. Service Layer
- **API Service**: Centralized HTTP client
- **Auth API**: Authentication endpoints
- **Domain APIs**: Users, Candidates, Interviews, Calls, Audit Logs

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           🗄️ DATABASE SCHEMA                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

CORE TABLES
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 USERS                                           │
│ ┌─────────────────┬─────────────────┬─────────────────┬─────────────────────────┐ │
│ │ id (PK)         │ email (UK)      │ full_name       │ password_hash           │ │
│ │ INT             │ VARCHAR(255)    │ VARCHAR(255)    │ VARCHAR(255)            │ │
│ ├─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤ │
│ │ role            │ active          │ created_at      │ updated_at              │ │
│ │ ENUM            │ BOOLEAN         │ TIMESTAMP       │ TIMESTAMP               │ │
│ │ (admin,manager, │ DEFAULT true    │                 │                         │ │
│ │ agent,viewer)   │                 │                 │                         │ │
│ └─────────────────┴─────────────────┴─────────────────┴─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
    
                                        │
                                        ▼ (One-to-Many)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            USER_PAGE_ACCESS                                    │
│ ┌─────────────────┬─────────────────┬─────────────────┬─────────────────────────┐ │
│ │ id (PK)         │ user_id (FK)    │ page_name       │ has_access              │ │
│ │ INT             │ INT → users.id  │ ENUM            │ BOOLEAN                 │ │
│ │                 │                 │ (dashboard,     │ DEFAULT false           │ │
│ │                 │                 │ interviews,     │                         │ │
│ │                 │                 │ candidates,     │                         │ │
│ │                 │                 │ calls,settings, │                         │ │
│ │                 │                 │ user_mgmt)      │                         │ │
│ ├─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤ │
│ │ created_at      │ updated_at      │                 │                         │ │
│ │ TIMESTAMP       │ TIMESTAMP       │                 │                         │ │
│ └─────────────────┴─────────────────┴─────────────────┴─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

BUSINESS DOMAIN TABLES
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               CANDIDATES                                        │
│ ┌─────────────────┬─────────────────┬─────────────────┬─────────────────────────┐ │
│ │ id (PK)         │ full_name       │ email (UK)      │ position                │ │
│ │ INT             │ VARCHAR(255)    │ VARCHAR(255)    │ VARCHAR(255)            │ │
│ ├─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤ │
│ │ status          │ phone           │ resume_url      │ notes                   │ │
│ │ ENUM            │ VARCHAR(20)     │ VARCHAR(500)    │ TEXT                    │ │
│ │ (applied,       │                 │                 │                         │ │
│ │ screening,      │                 │                 │                         │ │
│ │ interviewed,    │                 │                 │                         │ │
│ │ hired,rejected) │                 │                 │                         │ │
│ ├─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤ │
│ │ created_at      │ updated_at      │                 │                         │ │
│ │ TIMESTAMP       │ TIMESTAMP       │                 │                         │ │
│ └─────────────────┴─────────────────┴─────────────────┴─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼ (One-to-Many)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               INTERVIEWS                                        │
│ ┌─────────────────┬─────────────────┬─────────────────┬─────────────────────────┐ │
│ │ id (PK)         │ candidate_id(FK)│ interviewer_name│ scheduled_at            │ │
│ │ INT             │ INT→candidates  │ VARCHAR(255)    │ TIMESTAMP               │ │
│ │                 │ .id             │                 │                         │ │
│ ├─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤ │
│ │ duration_mins   │ status          │ interview_type  │ notes                   │ │
│ │ INT             │ ENUM            │ VARCHAR(100)    │ TEXT                    │ │
│ │ DEFAULT 60      │ (scheduled,     │                 │                         │ │
│ │                 │ in_progress,    │                 │                         │ │
│ │                 │ completed,      │                 │                         │ │
│ │                 │ cancelled,      │                 │                         │ │
│ │                 │ no_show)        │                 │                         │ │
│ ├─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤ │
│ │ score           │ created_at      │ updated_at      │                         │ │
│ │ INT             │ TIMESTAMP       │ TIMESTAMP       │                         │ │
│ │ (1-10 scale)    │                 │                 │                         │ │
│ └─────────────────┴─────────────────┴─────────────────┴─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 CALLS                                          │
│ ┌─────────────────┬─────────────────┬─────────────────┬─────────────────────────┐ │
│ │ id (PK)         │ caller_name     │ caller_number   │ call_type               │ │
│ │ INT             │ VARCHAR(255)    │ VARCHAR(20)     │ ENUM                    │ │
│ │                 │                 │                 │ (inbound,outbound,      │ │
│ │                 │                 │                 │ missed,voicemail)       │ │
│ ├─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤ │
│ │ status          │ duration_secs   │ is_important    │ notes                   │ │
│ │ ENUM            │ INT             │ BOOLEAN         │ TEXT                    │ │
│ │ (answered,      │ DEFAULT 0       │ DEFAULT false   │                         │ │
│ │ missed,busy,    │                 │                 │                         │ │
│ │ voicemail)      │                 │                 │                         │ │
│ ├─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤ │
│ │ created_at      │                 │                 │                         │ │
│ │ TIMESTAMP       │                 │                 │                         │ │
│ └─────────────────┴─────────────────┴─────────────────┴─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

AUDIT & TRACKING TABLE
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AUDIT_LOGS                                        │
│ ┌─────────────────┬─────────────────┬─────────────────┬─────────────────────────┐ │
│ │ id (PK)         │ actor_id (FK)   │ action          │ target                  │ │
│ │ INT             │ INT → users.id  │ VARCHAR(100)    │ VARCHAR(100)            │ │
│ │                 │                 │ (login,logout,  │ (user,candidate,        │ │
│ │                 │                 │ create_user,    │ interview,call,         │ │
│ │                 │                 │ update_user,    │ permission)             │ │
│ │                 │                 │ delete_user,    │                         │ │
│ │                 │                 │ toggle_perm,etc)│                         │ │
│ ├─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤ │
│ │ metadata        │ timestamp       │ target_user_id  │                         │ │
│ │ JSON            │ TIMESTAMP       │ INT → users.id  │                         │ │
│ │ (before/after   │                 │ (nullable)      │                         │ │
│ │ values, context)│                 │                 │                         │ │
│ └─────────────────┴─────────────────┴─────────────────┴─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

RELATIONSHIPS SUMMARY
┌─────────────────────────────────────────────────────────────────────────────────┐
│ USERS (1) ──────────────────── (Many) USER_PAGE_ACCESS                         │
│ USERS (1) ──────────────────── (Many) AUDIT_LOGS (actor)                       │
│ USERS (1) ──────────────────── (Many) AUDIT_LOGS (target)                      │
│ CANDIDATES (1) ─────────────── (Many) INTERVIEWS                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Database Design Principles

#### 1. Normalization
- **3rd Normal Form**: Eliminates data redundancy
- **Referential Integrity**: Foreign key constraints
- **Data Types**: Appropriate types for each field

#### 2. Performance Optimization
- **Indexes**: On frequently queried columns
- **Constraints**: Unique constraints on email fields
- **Pagination**: Efficient limit/offset queries

#### 3. Audit Trail
- **Comprehensive Logging**: 22+ action types tracked
- **Metadata Storage**: JSON fields for flexible data
- **User Attribution**: Links actions to actors

### Key Tables

#### Users Table
- **Primary Key**: Auto-incrementing ID
- **Unique Constraints**: Email (case-insensitive)
- **Enums**: Role (admin, manager, agent, viewer)
- **Relationships**: One-to-many with permissions and audit logs

#### User Page Access Table
- **Purpose**: Per-user permission overrides
- **Composite Key**: User ID + Page Name
- **Pages**: dashboard, interviews, candidates, calls, settings, user_management

#### Audit Logs Table
- **Purpose**: Complete action tracking
- **Metadata**: JSON field for before/after values
- **Actions**: Login, CRUD operations, permission changes

## Security & Permissions

### Permission System Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ✅ PERMISSION SYSTEM                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

1. ROLE-BASED DEFAULT PERMISSIONS
┌─────────────┐                        ┌─────────────────────────────────────────┐
│ User Role   │                        │            Default Access               │
│             │                        │                                         │
│ ADMIN       │ ─────────────────────► │ ✅ ALL PAGES (Dashboard, Users, etc.)  │
│ MANAGER     │ ─────────────────────► │ ✅ Most Pages (NO User Management)     │
│ AGENT       │ ─────────────────────► │ ✅ Limited Pages (Dashboard, Calls)    │
│ VIEWER      │ ─────────────────────► │ ✅ Read-Only (Dashboard, Settings)     │
└─────────────┘                        └─────────────────────────────────────────┘

2. PERMISSION OVERRIDE SYSTEM
┌─────────────┐   Can Override    ┌─────────────┐   Live Toggle    ┌─────────────┐
│    ADMIN    │ ─────────────────► │ Permission  │ ─────────────────► │  Database   │
│   User      │   Individual      │   Toggle    │   Real-time      │   Update    │
│             │   Permissions     │   Switch    │   Update         │             │
└─────────────┘                   └─────────────┘                  └─────────────┘
       │                                 │                                │
       │                                 ▼                                ▼
       │                          ┌─────────────┐                 ┌─────────────┐
       └─────────────────────────►│ Audit Log  │◄────────────────│ Permission  │
                                  │ Entry      │                 │ Applied     │
                                  └─────────────┘                 └─────────────┘

3. PERMISSION CHECK FLOW
┌─────────────┐   API Request     ┌─────────────┐   Check Role     ┌─────────────┐
│   Frontend  │ ─────────────────► │   Backend   │ ─────────────────► │  Database   │
│ Component   │   with JWT        │ Middleware  │   + Overrides    │   Query     │
└─────────────┘                   └─────────────┘                  └─────────────┘
       │                                 │                                │
       │                                 ▼                                │
       │                          ┌─────────────┐                        │
       │                          │ Permission  │ ◄──────────────────────┘
       │                          │ Evaluation  │
       │                          └─────────────┘
       │                                 │
       │            ┌────────────────────┼────────────────────┐
       │            ▼                    ▼                    ▼
       │    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
       │    │ HAS ACCESS  │      │ NO ACCESS   │      │ OVERRIDE    │
       │    │ → 200 OK    │      │ → 403       │      │ GRANTS      │
       │    │   + Data    │      │   Forbidden │      │ → 200 OK    │
       │    └─────────────┘      └─────────────┘      └─────────────┘
       │            │                    │                    │
       └────────────┼────────────────────┼────────────────────┘
                    ▼                    ▼
            ┌─────────────┐      ┌─────────────┐
            │ Show Page   │      │ Redirect to │
            │ Content     │      │/unauthorized│
            └─────────────┘      └─────────────┘

4. PERMISSION MATRIX
┌─────────┬───────────┬────────────┬────────────┬───────┬──────────┬───────────┐
│  Role   │ Dashboard │ Interviews │ Candidates │ Calls │ Settings │ User Mgmt │
├─────────┼───────────┼────────────┼────────────┼───────┼──────────┼───────────┤
│ Admin   │    ✅     │     ✅     │     ✅     │  ✅   │    ✅    │     ✅    │
│ Manager │    ✅     │     ✅     │     ✅     │  ✅   │    ✅    │     ❌    │
│ Agent   │    ✅     │     ✅     │     ❌     │  ✅   │    ✅    │     ❌    │
│ Viewer  │    ✅     │     ❌     │     ❌     │  ❌   │    ✅    │     ❌    │
└─────────┴───────────┴────────────┴────────────┴───────┴──────────┴───────────┘
                    ⬆ ADMIN CAN OVERRIDE ANY PERMISSION ⬆
```

### Security Layers

#### 1. Authentication
- **JWT Tokens**: Stateless authentication
- **Refresh Mechanism**: Automatic token renewal
- **Session Management**: Persistent across browser sessions
- **Logout**: Secure token cleanup

#### 2. Authorization
- **Role-Based Access Control (RBAC)**: Four user roles
- **Page-Level Permissions**: Granular access control
- **Override System**: Admin can grant/revoke individual permissions
- **Real-Time Updates**: Permission changes take effect immediately

#### 3. Protection Mechanisms
- **CSRF Protection**: HMAC-based tokens with session binding
- **Rate Limiting**: Redis-backed with in-memory fallback
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Input Validation**: Pydantic schemas and sanitization

#### 4. Audit & Compliance
- **Comprehensive Logging**: All user actions tracked
- **Role-Based Log Access**: Users see appropriate logs
- **Metadata Capture**: Before/after values for changes
- **Retention Policy**: Configurable log retention

### Permission Matrix

| Role | Dashboard | Interviews | Candidates | Calls | Settings | User Mgmt |
|------|-----------|------------|------------|-------|----------|-----------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Agent | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |

*Note: Admins can override default permissions for individual users*

## Deployment Architecture

### Environment Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          🚀 DEPLOYMENT ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────────┘

DEVELOPMENT ENVIRONMENT
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Docker Compose Setup                                │
│                                                                                 │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│ │   Frontend      │  │    Backend      │  │   Database      │  │    Redis    │ │
│ │   Container     │  │   Container     │  │   Container     │  │  Container  │ │
│ │                 │  │                 │  │                 │  │             │ │
│ │ React + Node.js │  │FastAPI + Python │  │   PostgreSQL    │  │Rate Limiting│ │
│ │ Port: 3000      │  │ Port: 8000      │  │   Port: 5432    │  │Port: 6379   │ │
│ │ Hot Reload ✅   │  │ Auto Restart ✅ │  │ Persistent Data │  │ In-Memory   │ │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│         │                       │                       │                      │
│         └───────────────────────┼───────────────────────┼──────────────────────┘
│                                 │                       │
│                        ┌────────▼────────┐     ┌────────▼────────┐
│                        │  API Requests   │     │ Database Queries│
│                        │  HTTP/HTTPS     │     │ SQL Migrations  │
│                        └─────────────────┘     └─────────────────┘
└─────────────────────────────────────────────────────────────────────────────────┘

LOCAL DEVELOPMENT (Alternative)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Native Setup                                      │
│                                                                                 │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────────┐ │
│ │   Frontend      │  │    Backend      │  │           Database                  │ │
│ │   npm start     │  │uvicorn --reload │  │        PostgreSQL                   │ │
│ │                 │  │                 │  │                                     │ │
│ │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ ┌─────────────────┐ │ │
│ │ │ Port: 3000  │ │  │ │ Port: 8000  │ │  │ │Port: 5432   │ │ Alembic         │ │ │
│ │ │ Hot Reload  │ │  │ │ Auto Restart│ │  │ │Local Install│ │ Migrations      │ │ │
│ │ │ Live Coding │ │  │ │ Debug Mode  │ │  │ │Data Persist │ │ Schema Updates  │ │ │
│ │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ └─────────────────┘ │ │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

PRODUCTION DEPLOYMENT OPTIONS
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               Frontend Options                                 │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────────┐ │
│ │     Vercel      │  │    Netlify      │  │          AWS S3 + CloudFront        │ │
│ │                 │  │                 │  │                                     │ │
│ │ ✅ Zero Config  │  │ ✅ JAMstack     │  │ ✅ Enterprise Scale                │ │
│ │ ✅ Auto Deploy  │  │ ✅ Form Handling│  │ ✅ Global CDN                      │ │
│ │ ✅ Edge Network │  │ ✅ Split Testing│  │ ✅ Custom Domain                   │ │
│ │ ✅ Free Tier    │  │ ✅ Free Tier    │  │ ✅ High Availability               │ │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                               Backend Options                                  │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│ │    Railway      │  │     Render      │  │     Heroku      │  │  AWS ECS    │ │
│ │                 │  │                 │  │                 │  │             │ │
│ │ ✅ Containers   │  │ ✅ Web Service  │  │ ✅ PaaS Model   │  │ ✅ Container│ │
│ │ ✅ Auto Scale   │  │ ✅ Auto Deploy  │  │ ✅ Add-ons      │  │    Service  │ │
│ │ ✅ DB Included  │  │ ✅ Free Tier    │  │ ✅ Established  │  │ ✅ Full     │ │
│ │ ✅ Simple Setup │  │ ✅ SSL/TLS      │  │ ✅ Monitoring   │  │    Control  │ │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Database Options                                  │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────────┐ │
│ │Railway PostgreSQL│  │    AWS RDS      │  │           Supabase                  │ │
│ │                 │  │                 │  │                                     │ │
│ │ ✅ Managed DB   │  │ ✅ Enterprise   │  │ ✅ Database as a Service            │ │
│ │ ✅ Auto Backups │  │    Grade        │  │ ✅ Built-in Auth                   │ │
│ │ ✅ Easy Setup   │  │ ✅ Multi-AZ     │  │ ✅ Real-time Features              │ │
│ │ ✅ Free Tier    │  │ ✅ Read Replicas│  │ ✅ Dashboard & Analytics           │ │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

CI/CD PIPELINE
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            GitHub Actions Workflow                             │
│                                                                                 │
│ ┌─────────────┐    Push/PR    ┌─────────────┐    Quality     ┌─────────────────┐ │
│ │    Git      │ ─────────────► │   GitHub    │ ──── Gates ───► │   Build &       │ │
│ │ Repository  │               │   Actions   │               │   Test          │ │
│ └─────────────┘               └─────────────┘               └─────────────────┘ │
│                                      │                              │           │
│                                      ▼                              ▼           │
│                               ┌─────────────┐                ┌─────────────────┐ │
│                               │ Automated   │                │   Deployment    │ │
│                               │ Testing     │                │   to Production │ │
│                               └─────────────┘                └─────────────────┘ │
│                                                                                 │
│ Quality Gates Include:                                                          │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│ │ ESLint &        │ │ Jest & pytest   │ │ TypeScript      │ │ Security      │ │
│ │ Prettier        │ │ Unit Tests      │ │ Type Checking   │ │ Scanning      │ │
│ │ Code Style      │ │ Integration     │ │ Build Success   │ │ Vulnerability │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

RECOMMENDED PRODUCTION STACK
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            🏆 OPTIMAL SETUP                                    │
│                                                                                 │
│ Frontend: Vercel (React build + CDN)                                           │
│ Backend:  Railway (FastAPI container + auto-scaling)                           │
│ Database: Railway PostgreSQL (managed + backups)                               │
│ CI/CD:    GitHub Actions (automated testing + deployment)                      │
│ Domain:   Custom domain with SSL/TLS                                           │
│ Monitor:  Built-in platform monitoring + alerts                                │
│                                                                                 │
│ ✅ Cost: $0-20/month for small-medium apps                                     │
│ ✅ Scale: Handles 10k+ users with auto-scaling                                 │
│ ✅ Maintenance: Minimal operational overhead                                    │
│ ✅ Security: SSL, backups, monitoring included                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Deployment Strategies

#### 1. Development
- **Docker Compose**: Multi-container local development
- **Hot Reload**: Automatic code reloading
- **Debug Mode**: Enhanced logging and error reporting
- **Local Database**: PostgreSQL container

#### 2. Staging
- **Production Build**: Optimized frontend bundle
- **SSL/TLS**: HTTPS encryption
- **Test Database**: Separate from production
- **Performance Testing**: Load testing and profiling

#### 3. Production
- **CDN**: Content delivery network for static assets
- **Managed Database**: Cloud-hosted PostgreSQL
- **Auto Scaling**: Horizontal scaling based on load
- **Monitoring**: Application performance monitoring

## Technology Stack

### Frontend Stack
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Type safety and developer experience
- **React Router v6**: Client-side routing with guards
- **React Query**: Server state management and caching
- **React Hook Form**: Form validation and handling
- **Tailwind CSS**: Utility-first CSS framework
- **Heroicons**: Consistent icon library
- **React Hot Toast**: User notifications

### Backend Stack
- **FastAPI**: Modern Python web framework
- **Python 3.11+**: Latest Python features
- **SQLAlchemy**: ORM with relationship management
- **Alembic**: Database migration management
- **Pydantic**: Data validation and serialization
- **JWT**: Stateless authentication
- **bcrypt**: Password hashing
- **Redis**: Caching and rate limiting

### Database & Infrastructure
- **PostgreSQL**: Relational database with ACID compliance
- **Docker**: Containerization for development and deployment
- **Docker Compose**: Multi-container orchestration
- **Git**: Version control with conventional commits

### Development Tools
- **ESLint + Prettier**: Code formatting and linting
- **Jest**: JavaScript testing framework
- **pytest**: Python testing framework
- **TypeScript**: Static type checking
- **VS Code**: Recommended IDE with extensions

## Design Patterns

### Backend Patterns

#### 1. Repository Pattern
```python
# CRUD base class with common operations
class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        return db.query(self.model).filter(self.model.id == id).first()
    
    def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
        # Implementation
```

#### 2. Dependency Injection
```python
# FastAPI dependency system
def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    # Implementation
```

#### 3. Middleware Pattern
```python
# Security middleware stack
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CORSMiddleware, ...)
app.state.limiter = limiter
```

### Frontend Patterns

#### 1. Context Provider Pattern
```typescript
// Authentication context
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // Implementation
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

#### 2. Custom Hooks Pattern
```typescript
// Reusable authentication hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

#### 3. Higher-Order Component Pattern
```typescript
// Protected route wrapper
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPage }) => {
  const { isAuthenticated, permissions } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (requiredPage && !permissions[requiredPage]) return <Navigate to="/unauthorized" />;
  
  return <>{children}</>;
};
```

### Database Patterns

#### 1. Active Record Pattern
```python
# SQLAlchemy models with relationships
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    page_access_overrides = relationship("UserPageAccess", back_populates="user")
```

#### 2. Migration Pattern
```python
# Alembic migration management
def upgrade() -> None:
    op.create_table('users', ...)
    
def downgrade() -> None:
    op.drop_table('users')
```

## Performance Considerations

### Frontend Optimizations
- **Code Splitting**: Route-based code splitting
- **React Query Caching**: Intelligent server state caching
- **Debounced Search**: Reduces API calls
- **Memoization**: React.memo for expensive components
- **Bundle Optimization**: Tree shaking and minification

### Backend Optimizations
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Efficient database connections
- **Rate Limiting**: Prevents abuse and ensures availability
- **Async Operations**: Non-blocking I/O operations
- **Response Caching**: Redis-based caching strategy

### Database Optimizations
- **Proper Indexing**: On frequently queried columns
- **Query Optimization**: Efficient JOIN operations
- **Pagination**: Limit/offset for large datasets
- **Connection Management**: Pool size optimization

## Security Best Practices

### Authentication Security
- **Strong Password Policies**: Minimum requirements enforced
- **JWT Best Practices**: Short-lived access tokens
- **Refresh Token Rotation**: Enhanced security
- **Secure Cookie Settings**: httpOnly, secure, sameSite

### API Security
- **Input Validation**: All inputs validated and sanitized
- **SQL Injection Prevention**: ORM usage and parameterized queries
- **XSS Protection**: Content Security Policy headers
- **CORS Configuration**: Restricted to trusted origins

### Infrastructure Security
- **HTTPS Enforcement**: All communication encrypted
- **Environment Variables**: Sensitive data protection
- **Security Headers**: Comprehensive header configuration
- **Regular Updates**: Dependency vulnerability management

---

*This architecture documentation is maintained alongside the codebase and should be updated as the system evolves.*
