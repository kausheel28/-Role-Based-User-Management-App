# AI-assisted: see ai-assist.md
"""
Test configuration and fixtures
"""
import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_app.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    echo=False  # Disable SQL logging in tests
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# Override the database dependency
app.dependency_overrides[get_db] = override_get_db

# Disable rate limiting for tests by removing the middleware
# We need to rebuild the middleware stack without rate limiting
from app.middleware.rate_limit import limiter
limiter.enabled = False  # Disable rate limiting globally for tests

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Setup test database once for all tests"""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    yield
    # Clean up
    try:
        # Close all connections
        engine.dispose()
        Base.metadata.drop_all(bind=engine)
    except Exception:
        pass
    
    # Clean up test database file
    try:
        if os.path.exists("./test_app.db"):
            os.remove("./test_app.db")
    except PermissionError:
        # File is still in use, skip cleanup
        pass

@pytest.fixture(autouse=True)
def clean_db():
    """Clean database between tests"""
    db = TestingSessionLocal()
    try:
        # Delete all data from all tables
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

@pytest.fixture
def test_client():
    """Provide test client"""
    return client

@pytest.fixture
def test_db():
    """Provide test database session"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def admin_user(test_db):
    """Create admin user for testing"""
    user = User(
        email="admin@test.com",
        full_name="Admin User",
        password_hash=get_password_hash("admin123"),
        role=UserRole.ADMIN,
        active=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user

@pytest.fixture
def manager_user(test_db):
    """Create manager user for testing"""
    user = User(
        email="manager@test.com",
        full_name="Manager User",
        password_hash=get_password_hash("manager123"),
        role=UserRole.MANAGER,
        active=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user

@pytest.fixture
def agent_user(test_db):
    """Create agent user for testing"""
    user = User(
        email="agent@test.com",
        full_name="Agent User",
        password_hash=get_password_hash("agent123"),
        role=UserRole.AGENT,
        active=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user

@pytest.fixture
def viewer_user(test_db):
    """Create viewer user for testing"""
    user = User(
        email="viewer@test.com",
        full_name="Viewer User",
        password_hash=get_password_hash("viewer123"),
        role=UserRole.VIEWER,
        active=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user

@pytest.fixture
def admin_token(test_client, admin_user):
    """Get admin authentication token"""
    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "admin123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def manager_token(test_client, manager_user):
    """Get manager authentication token"""
    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "manager@test.com", "password": "manager123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def agent_token(test_client, agent_user):
    """Get agent authentication token"""
    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "agent@test.com", "password": "agent123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def viewer_token(test_client, viewer_user):
    """Get viewer authentication token"""
    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "viewer@test.com", "password": "viewer123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

# Helper functions for tests
def create_auth_headers(token: str) -> dict:
    """Create authorization headers with token"""
    return {"Authorization": f"Bearer {token}"}

def login_user(client: TestClient, email: str, password: str) -> dict:
    """Login user and return token data"""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password}
    )
    assert response.status_code == 200
    return response.json()
