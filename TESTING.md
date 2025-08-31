# Testing Documentation

## Overview

This document outlines the comprehensive testing strategy for the User Management & Multi-Screen Admin App, including unit tests, integration tests, and end-to-end testing approaches.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Backend Testing](#backend-testing)
3. [Frontend Testing](#frontend-testing)
4. [Integration Testing](#integration-testing)
5. [Security Testing](#security-testing)
6. [Performance Testing](#performance-testing)
7. [Test Automation](#test-automation)
8. [Testing Best Practices](#testing-best-practices)

## Testing Strategy

### Testing Pyramid

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            🧪 TESTING PYRAMID                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │  END-TO-END     │ 🔴 5% - Slow, Expensive
                              │     TESTS       │    Full User Journeys
                              │                 │    Browser Automation
                              └─────────────────┘
                                      │
                          ┌───────────────────────────┐
                          │    INTEGRATION TESTS      │ 🟢 20% - Medium Speed
                          │                           │      API + Database
                          │  Component Interactions   │      Service Integration
                          │  Database Operations      │      Critical Workflows
                          └───────────────────────────┘
                                      │
                  ┌─────────────────────────────────────────────┐
                  │               UNIT TESTS                    │ 🔵 75% - Fast, Cheap
                  │                                             │      Individual Functions
                  │  Individual Functions & Components          │      Isolated Testing
                  │  Business Logic & Utilities                 │      High Coverage
                  │  Mocked Dependencies                        │      Quick Feedback
                  │  Fast Execution (< 1 sec per test)         │      
                  └─────────────────────────────────────────────┘

TEST DISTRIBUTION RATIONALE:
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Unit Tests (75%):                                                              │
│ • Fast feedback loop for developers                                            │
│ • Catch bugs early in development cycle                                        │
│ • Easy to write and maintain                                                   │
│ • High code coverage achievable                                                │
│                                                                                 │
│ Integration Tests (20%):                                                       │
│ • Verify component interactions work correctly                                 │
│ • Test API contracts and data flow                                             │
│ • Validate database operations                                                 │
│ • Cover critical business workflows                                            │
│                                                                                 │
│ End-to-End Tests (5%):                                                         │
│ • Validate complete user journeys                                              │
│ • Test from user's perspective                                                 │
│ • Catch integration issues across entire stack                                 │
│ • Focus on happy path and critical scenarios only                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Test Types

#### 1. Unit Tests (75%)
- **Purpose**: Test individual functions and components
- **Scope**: Single units of code in isolation
- **Speed**: Fast execution (< 1 second per test)
- **Coverage**: Aim for 80%+ code coverage

#### 2. Integration Tests (20%)
- **Purpose**: Test component interactions
- **Scope**: API endpoints, database operations, service integration
- **Speed**: Medium execution (1-5 seconds per test)
- **Coverage**: Critical user workflows

#### 3. End-to-End Tests (5%)
- **Purpose**: Test complete user journeys
- **Scope**: Full application workflows
- **Speed**: Slow execution (10-60 seconds per test)
- **Coverage**: Happy path and critical scenarios

## Backend Testing

### Testing Framework Setup

#### pytest Configuration
```python
# pytest.ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --verbose
    --tb=short
    --cov=app
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=80
```

#### Test Database Setup
```python
# conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Test database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()
```

### Unit Tests

#### Model Tests
```python
# tests/test_models.py
def test_user_model_creation():
    user_data = {
        "email": "test@example.com",
        "full_name": "Test User",
        "password_hash": "hashed_password",
        "role": UserRole.AGENT,
        "active": True
    }
    user = User(**user_data)
    
    assert user.email == "test@example.com"
    assert user.role == UserRole.AGENT
    assert user.active is True

def test_user_password_hashing():
    password = "test_password"
    hashed = get_password_hash(password)
    
    assert verify_password(password, hashed)
    assert not verify_password("wrong_password", hashed)
```

#### CRUD Tests
```python
# tests/test_crud_user.py
def test_create_user(db_session):
    user_data = UserCreate(
        email="test@example.com",
        full_name="Test User",
        password="password123",
        role=UserRole.AGENT
    )
    user = crud_user.create(db_session, obj_in=user_data)
    
    assert user.email == user_data.email
    assert user.full_name == user_data.full_name
    assert verify_password(user_data.password, user.password_hash)

def test_get_user_by_email(db_session):
    # Create test user
    user = create_test_user(db_session)
    
    # Retrieve by email
    found_user = crud_user.get_by_email(db_session, email=user.email)
    
    assert found_user
    assert found_user.id == user.id
    assert found_user.email == user.email

def test_authenticate_user(db_session):
    password = "test_password"
    user = create_test_user(db_session, password=password)
    
    # Test successful authentication
    authenticated_user = crud_user.authenticate(
        db_session, email=user.email, password=password
    )
    assert authenticated_user
    assert authenticated_user.id == user.id
    
    # Test failed authentication
    failed_auth = crud_user.authenticate(
        db_session, email=user.email, password="wrong_password"
    )
    assert failed_auth is False
```

### API Tests

#### Authentication Tests
```python
# tests/test_auth.py
def test_login_success(client, db_session):
    # Create test user
    user = create_test_user(db_session, password="password123")
    
    response = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "password123"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials(client, db_session):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "wrong"}
    )
    
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

def test_protected_route_without_token(client):
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401

def test_protected_route_with_valid_token(client, db_session):
    user = create_test_user(db_session)
    token = create_access_token(user.id)
    
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/users/me", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user.email
```

#### Permission Tests
```python
# tests/test_permissions.py
def test_admin_can_access_user_management(client, db_session):
    admin_user = create_test_user(db_session, role=UserRole.ADMIN)
    token = create_access_token(admin_user.id)
    
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/users/", headers=headers)
    
    assert response.status_code == 200

def test_agent_cannot_access_user_management(client, db_session):
    agent_user = create_test_user(db_session, role=UserRole.AGENT)
    token = create_access_token(agent_user.id)
    
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/users/", headers=headers)
    
    assert response.status_code == 403

def test_permission_override_grants_access(client, db_session):
    agent_user = create_test_user(db_session, role=UserRole.AGENT)
    
    # Grant user_management permission to agent
    permission = UserPageAccess(
        user_id=agent_user.id,
        page_name=PageName.USER_MANAGEMENT,
        has_access=True
    )
    db_session.add(permission)
    db_session.commit()
    
    token = create_access_token(agent_user.id)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/users/", headers=headers)
    
    assert response.status_code == 200
```

### Database Tests

#### Migration Tests
```python
# tests/test_migrations.py
def test_migration_up_and_down():
    # Test migration up
    alembic_config = Config("alembic.ini")
    command.upgrade(alembic_config, "head")
    
    # Verify tables exist
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    expected_tables = ["users", "user_page_access", "candidates", "interviews", "calls", "audit_logs"]
    for table in expected_tables:
        assert table in tables
    
    # Test migration down
    command.downgrade(alembic_config, "base")
    
    # Verify tables are dropped
    tables = inspector.get_table_names()
    for table in expected_tables:
        assert table not in tables
```

## Frontend Testing

### Testing Framework Setup

#### Jest Configuration
```json
// package.json
{
  "scripts": {
    "test": "react-scripts test",
    "test:coverage": "react-scripts test --coverage --watchAll=false",
    "test:ci": "CI=true react-scripts test --coverage --watchAll=false"
  },
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.{ts,tsx}",
      "!src/**/*.d.ts",
      "!src/index.tsx",
      "!src/serviceWorker.ts"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 70,
        "lines": 70,
        "statements": 70
      }
    }
  }
}
```

#### Test Utilities
```typescript
// src/utils/test-utils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

// Mock API module
jest.mock('../services/api');

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
}

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### Component Tests

#### Authentication Tests
```typescript
// src/contexts/__tests__/AuthContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useAuth, AuthProvider } from '../AuthContext';
import { authApi } from '../../services/api';

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should login successfully', async () => {
    const mockTokens = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      token_type: 'bearer'
    };
    
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'agent'
    };

    mockAuthApi.login.mockResolvedValue({ data: mockTokens });
    mockAuthApi.getMe.mockResolvedValue({ data: mockUser });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password'
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('should handle login failure', async () => {
    mockAuthApi.login.mockRejectedValue({
      response: { data: { detail: 'Invalid credentials' } }
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      try {
        await result.current.login({
          email: 'test@example.com',
          password: 'wrong-password'
        });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
```

#### Protected Route Tests
```typescript
// src/components/__tests__/ProtectedRoute.test.tsx
import { render, screen } from '../../utils/test-utils';
import ProtectedRoute from '../ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('ProtectedRoute', () => {
  it('should redirect to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      permissions: {},
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should show content when authenticated with permission', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      permissions: { dashboard: true },
      user: { id: 1, email: 'test@example.com' },
      login: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    });

    render(
      <ProtectedRoute requiredPage="dashboard">
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to unauthorized when missing permission', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      permissions: { dashboard: false },
      user: { id: 1, email: 'test@example.com' },
      login: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    });

    render(
      <ProtectedRoute requiredPage="dashboard">
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
```

#### Page Component Tests
```typescript
// src/pages/__tests__/UsersPage.test.tsx
import { render, screen, waitFor, fireEvent } from '../../utils/test-utils';
import UsersPage from '../UsersPage';
import { usersApi } from '../../services/api';

jest.mock('../../services/api');
const mockUsersApi = usersApi as jest.Mocked<typeof usersApi>;

describe('UsersPage', () => {
  const mockUsers = [
    {
      id: 1,
      email: 'admin@example.com',
      full_name: 'Admin User',
      role: 'admin',
      active: true,
      page_permissions: {
        dashboard: true,
        user_management: true
      }
    }
  ];

  beforeEach(() => {
    mockUsersApi.getUsers.mockResolvedValue({ data: mockUsers });
  });

  it('should render users table', async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });
  });

  it('should handle search functionality', async () => {
    render(<UsersPage />);

    const searchInput = screen.getByPlaceholderText(/search users/i);
    fireEvent.change(searchInput, { target: { value: 'admin' } });

    await waitFor(() => {
      expect(mockUsersApi.getUsers).toHaveBeenCalledWith(0, 10, 'admin');
    });
  });

  it('should toggle user permissions', async () => {
    mockUsersApi.updateUserPageAccess.mockResolvedValue({ 
      data: { message: 'Permission updated' }
    });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const toggleButton = screen.getByRole('button', { name: /toggle dashboard permission/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(mockUsersApi.updateUserPageAccess).toHaveBeenCalledWith(
        1, 'dashboard', false
      );
    });
  });
});
```

### Form Tests

#### Form Validation Tests
```typescript
// src/components/__tests__/UserForm.test.tsx
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import UserForm from '../UserForm';

describe('UserForm', () => {
  it('should validate required fields', async () => {
    const onSubmit = jest.fn();
    render(<UserForm onSubmit={onSubmit} />);

    const submitButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Full name is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should validate email format', async () => {
    render(<UserForm onSubmit={jest.fn()} />);

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });

  it('should validate password strength', async () => {
    render(<UserForm onSubmit={jest.fn()} />);

    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const onSubmit = jest.fn();
    render(<UserForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Test User' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });

    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        full_name: 'Test User',
        password: 'password123',
        role: 'viewer',
        active: true
      });
    });
  });
});
```

## Integration Testing

### API Integration Tests

#### End-to-End API Workflows
```python
# tests/integration/test_user_workflow.py
def test_complete_user_management_workflow(client, db_session):
    # 1. Admin login
    admin = create_test_user(db_session, role=UserRole.ADMIN)
    admin_token = create_access_token(admin.id)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 2. Create new user
    new_user_data = {
        "email": "newuser@example.com",
        "full_name": "New User",
        "password": "password123",
        "role": "agent",
        "active": True
    }
    
    response = client.post(
        "/api/v1/users/",
        json=new_user_data,
        headers=admin_headers
    )
    assert response.status_code == 200
    created_user = response.json()
    
    # 3. Update user permissions
    response = client.put(
        f"/api/v1/users/{created_user['id']}/page-access/candidates?has_access=true",
        headers=admin_headers
    )
    assert response.status_code == 200
    
    # 4. Verify user can access candidates endpoint
    user_token = create_access_token(created_user['id'])
    user_headers = {"Authorization": f"Bearer {user_token}"}
    
    response = client.get("/api/v1/candidates/", headers=user_headers)
    assert response.status_code == 200
    
    # 5. Verify audit log entry
    response = client.get("/api/v1/audit-logs/", headers=admin_headers)
    assert response.status_code == 200
    logs = response.json()
    
    # Should have logs for user creation and permission change
    assert any(log['action'] == 'create_user' for log in logs)
    assert any(log['action'] == 'toggle_permission' for log in logs)
```

### Database Integration Tests

#### Transaction Tests
```python
# tests/integration/test_transactions.py
def test_user_creation_with_permissions_rollback(db_session):
    """Test that user creation rolls back if permission assignment fails"""
    
    with pytest.raises(IntegrityError):
        with db_session.begin():
            # Create user
            user = User(
                email="test@example.com",
                full_name="Test User",
                password_hash="hashed_password",
                role=UserRole.AGENT
            )
            db_session.add(user)
            db_session.flush()  # Get user ID
            
            # Try to create invalid permission (should fail)
            permission = UserPageAccess(
                user_id=user.id,
                page_name="invalid_page",  # This should cause constraint violation
                has_access=True
            )
            db_session.add(permission)
    
    # Verify user was not created due to rollback
    assert db_session.query(User).filter(User.email == "test@example.com").first() is None
```

## Security Testing

### Authentication Security Tests

#### JWT Security Tests
```python
# tests/security/test_jwt_security.py
def test_jwt_token_expiration(client, db_session):
    user = create_test_user(db_session)
    
    # Create expired token
    expired_token = create_access_token(user.id, expires_delta=timedelta(seconds=-1))
    headers = {"Authorization": f"Bearer {expired_token}"}
    
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 401

def test_jwt_token_tampering(client, db_session):
    user = create_test_user(db_session)
    token = create_access_token(user.id)
    
    # Tamper with token
    tampered_token = token[:-5] + "XXXXX"
    headers = {"Authorization": f"Bearer {tampered_token}"}
    
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 401

def test_jwt_token_reuse_after_logout(client, db_session):
    user = create_test_user(db_session)
    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    
    # Verify token works
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    
    # Logout
    response = client.post("/api/v1/auth/logout", headers=headers)
    assert response.status_code == 200
    
    # Try to use token after logout (should still work as JWT is stateless)
    # Note: In production, implement token blacklisting for enhanced security
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200  # JWT tokens are stateless
```

#### Input Validation Tests
```python
# tests/security/test_input_validation.py
def test_sql_injection_protection(client, db_session):
    admin = create_test_user(db_session, role=UserRole.ADMIN)
    token = create_access_token(admin.id)
    headers = {"Authorization": f"Bearer {token}"}
    
    # Attempt SQL injection in search parameter
    malicious_search = "'; DROP TABLE users; --"
    
    response = client.get(
        f"/api/v1/users/?search={malicious_search}",
        headers=headers
    )
    
    # Should not crash and users table should still exist
    assert response.status_code == 200
    
    # Verify users table still exists by making another request
    response = client.get("/api/v1/users/", headers=headers)
    assert response.status_code == 200

def test_xss_protection_in_user_data(client, db_session):
    admin = create_test_user(db_session, role=UserRole.ADMIN)
    token = create_access_token(admin.id)
    headers = {"Authorization": f"Bearer {token}"}
    
    # Attempt XSS in user creation
    malicious_data = {
        "email": "test@example.com",
        "full_name": "<script>alert('xss')</script>",
        "password": "password123",
        "role": "agent"
    }
    
    response = client.post(
        "/api/v1/users/",
        json=malicious_data,
        headers=headers
    )
    
    # Should sanitize the input
    assert response.status_code == 200
    user = response.json()
    assert "<script>" not in user["full_name"]
```

### Authorization Tests

#### Permission Escalation Tests
```python
# tests/security/test_authorization.py
def test_prevent_role_escalation(client, db_session):
    # Manager tries to create admin user
    manager = create_test_user(db_session, role=UserRole.MANAGER)
    token = create_access_token(manager.id)
    headers = {"Authorization": f"Bearer {token}"}
    
    admin_user_data = {
        "email": "newadmin@example.com",
        "full_name": "New Admin",
        "password": "password123",
        "role": "admin"  # Manager trying to create admin
    }
    
    response = client.post(
        "/api/v1/users/",
        json=admin_user_data,
        headers=headers
    )
    
    # Should be forbidden
    assert response.status_code == 403

def test_prevent_permission_escalation(client, db_session):
    # Agent tries to grant themselves admin permissions
    agent = create_test_user(db_session, role=UserRole.AGENT)
    token = create_access_token(agent.id)
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.put(
        f"/api/v1/users/{agent.id}/page-access/user_management?has_access=true",
        headers=headers
    )
    
    # Should be forbidden (only admins can manage permissions)
    assert response.status_code == 403
```

## Performance Testing

### Load Testing

#### API Performance Tests
```python
# tests/performance/test_load.py
import asyncio
import aiohttp
import time
from concurrent.futures import ThreadPoolExecutor

async def make_request(session, url, headers):
    async with session.get(url, headers=headers) as response:
        return response.status

async def test_concurrent_requests():
    """Test API performance under concurrent load"""
    
    # Setup
    base_url = "http://localhost:8000"
    token = create_test_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test parameters
    concurrent_requests = 50
    total_requests = 500
    
    async with aiohttp.ClientSession() as session:
        start_time = time.time()
        
        # Create semaphore to limit concurrent connections
        semaphore = asyncio.Semaphore(concurrent_requests)
        
        async def bounded_request():
            async with semaphore:
                return await make_request(session, f"{base_url}/api/v1/users/", headers)
        
        # Execute requests
        tasks = [bounded_request() for _ in range(total_requests)]
        responses = await asyncio.gather(*tasks)
        
        end_time = time.time()
    
    # Analyze results
    duration = end_time - start_time
    requests_per_second = total_requests / duration
    success_rate = sum(1 for status in responses if status == 200) / total_requests
    
    print(f"Duration: {duration:.2f}s")
    print(f"Requests/second: {requests_per_second:.2f}")
    print(f"Success rate: {success_rate:.2%}")
    
    # Assertions
    assert success_rate >= 0.95  # 95% success rate
    assert requests_per_second >= 100  # At least 100 RPS
```

#### Database Performance Tests
```python
# tests/performance/test_database.py
def test_user_query_performance(db_session):
    """Test database query performance with large dataset"""
    
    # Create large dataset
    users = []
    for i in range(10000):
        user = User(
            email=f"user{i}@example.com",
            full_name=f"User {i}",
            password_hash="hashed_password",
            role=UserRole.AGENT
        )
        users.append(user)
    
    db_session.bulk_save_objects(users)
    db_session.commit()
    
    # Test query performance
    start_time = time.time()
    
    # Paginated query (should be fast with proper indexing)
    result = db_session.query(User).limit(10).offset(0).all()
    
    end_time = time.time()
    query_time = end_time - start_time
    
    assert len(result) == 10
    assert query_time < 0.1  # Should complete within 100ms
    
    # Test search performance
    start_time = time.time()
    
    search_result = db_session.query(User).filter(
        User.email.ilike("%user1000%")
    ).all()
    
    end_time = time.time()
    search_time = end_time - start_time
    
    assert len(search_result) > 0
    assert search_time < 0.1  # Should complete within 100ms
```

## Test Automation

### Continuous Integration

#### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
    
    - name: Run tests
      run: |
        cd backend
        pytest --cov=app --cov-report=xml
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml
        flags: backend

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run tests
      run: |
        cd frontend
        npm run test:ci
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./frontend/coverage/lcov.info
        flags: frontend

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Start application
      run: |
        docker-compose up -d
        sleep 30  # Wait for services to be ready
    
    - name: Run E2E tests
      run: |
        cd e2e
        npm ci
        npm run test
    
    - name: Stop application
      run: docker-compose down
```

### Test Data Management

#### Test Fixtures
```python
# tests/fixtures.py
@pytest.fixture
def test_users(db_session):
    """Create test users with different roles"""
    users = {
        'admin': User(
            email="admin@example.com",
            full_name="Admin User",
            password_hash=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            active=True
        ),
        'manager': User(
            email="manager@example.com",
            full_name="Manager User", 
            password_hash=get_password_hash("manager123"),
            role=UserRole.MANAGER,
            active=True
        ),
        'agent': User(
            email="agent@example.com",
            full_name="Agent User",
            password_hash=get_password_hash("agent123"),
            role=UserRole.AGENT,
            active=True
        ),
        'viewer': User(
            email="viewer@example.com",
            full_name="Viewer User",
            password_hash=get_password_hash("viewer123"),
            role=UserRole.VIEWER,
            active=True
        )
    }
    
    for user in users.values():
        db_session.add(user)
    db_session.commit()
    
    return users

@pytest.fixture
def test_candidates(db_session):
    """Create test candidates"""
    candidates = []
    for i in range(5):
        candidate = Candidate(
            full_name=f"Candidate {i}",
            email=f"candidate{i}@example.com",
            position=f"Position {i}",
            status=CandidateStatus.APPLIED,
            phone=f"123-456-789{i}"
        )
        candidates.append(candidate)
        db_session.add(candidate)
    
    db_session.commit()
    return candidates
```

## Testing Best Practices

### Test Organization

#### Test Structure
```
tests/
├── conftest.py              # Shared fixtures
├── fixtures.py              # Test data fixtures
├── unit/                    # Unit tests
│   ├── test_models.py
│   ├── test_crud.py
│   └── test_utils.py
├── integration/             # Integration tests
│   ├── test_api.py
│   └── test_workflows.py
├── security/                # Security tests
│   ├── test_auth.py
│   └── test_permissions.py
├── performance/             # Performance tests
│   └── test_load.py
└── e2e/                     # End-to-end tests
    └── test_user_journey.py
```

### Test Quality Guidelines

#### 1. Test Naming
```python
# Good: Descriptive test names
def test_user_creation_with_valid_data_returns_user_object():
    pass

def test_login_with_invalid_credentials_returns_401():
    pass

# Bad: Vague test names
def test_user():
    pass

def test_login():
    pass
```

#### 2. Test Independence
```python
# Good: Each test is independent
def test_user_creation(db_session):
    user_data = {"email": "test@example.com", ...}
    user = crud_user.create(db_session, obj_in=user_data)
    assert user.email == "test@example.com"

def test_user_update(db_session):
    # Create fresh user for this test
    user = create_test_user(db_session)
    updated_user = crud_user.update(db_session, db_obj=user, obj_in={"full_name": "New Name"})
    assert updated_user.full_name == "New Name"

# Bad: Tests depend on each other
user_id = None

def test_user_creation(db_session):
    global user_id
    user = create_test_user(db_session)
    user_id = user.id

def test_user_update(db_session):
    global user_id
    user = crud_user.get(db_session, id=user_id)  # Depends on previous test
    # ...
```

#### 3. Arrange-Act-Assert Pattern
```python
def test_user_authentication():
    # Arrange
    password = "test_password"
    user = create_test_user(db_session, password=password)
    
    # Act
    authenticated_user = crud_user.authenticate(
        db_session, email=user.email, password=password
    )
    
    # Assert
    assert authenticated_user is not None
    assert authenticated_user.id == user.id
```

#### 4. Mock External Dependencies
```python
# Good: Mock external services
@patch('app.services.email.send_email')
def test_user_registration_sends_welcome_email(mock_send_email):
    user_data = {"email": "test@example.com", ...}
    user = register_user(user_data)
    
    mock_send_email.assert_called_once_with(
        to=user.email,
        subject="Welcome",
        template="welcome"
    )

# Bad: Don't actually send emails in tests
def test_user_registration_sends_welcome_email():
    user_data = {"email": "test@example.com", ...}
    user = register_user(user_data)  # This would actually send an email
    # How do we verify the email was sent?
```

### Coverage Goals

#### Coverage Targets
- **Unit Tests**: 80%+ line coverage
- **Integration Tests**: 70%+ branch coverage
- **Critical Paths**: 100% coverage for authentication and authorization
- **Security Functions**: 100% coverage for security-related code

#### Coverage Exclusions
```python
# .coveragerc
[run]
source = app
omit = 
    */tests/*
    */venv/*
    */migrations/*
    */conftest.py
    */settings/*

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    if self.debug:
    if settings.DEBUG
    raise AssertionError
    raise NotImplementedError
    if 0:
    if __name__ == .__main__.:
```

---

*This testing documentation should be updated as new testing strategies and tools are adopted.*
