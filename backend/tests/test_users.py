# AI-assisted: see ai-assist.md
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
from app.models.user_page_access import UserPageAccess, PageName

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_users.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Setup test database once for all tests"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    # Clean up test database file
    if os.path.exists("./test_users.db"):
        os.remove("./test_users.db")

@pytest.fixture
def admin_user():
    db = TestingSessionLocal()
    user = User(
        email="admin@example.com",
        full_name="Admin User",
        password_hash=get_password_hash("admin123"),
        role=UserRole.ADMIN,
        active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    yield user
    db.delete(user)
    db.commit()
    db.close()

@pytest.fixture
def admin_token(admin_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "admin123"}
    )
    return response.json()["access_token"]

def test_create_user(admin_token):
    response = client.post(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": "newuser@example.com",
            "full_name": "New User",
            "password": "newpass123",
            "role": "agent",
            "active": True
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["role"] == "agent"

def test_get_users(admin_token):
    response = client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

# ===== PERMISSION DENIED TESTS =====

def test_non_admin_cannot_create_user():
    """Test that non-admin users cannot create new users"""
    # Create a non-admin user
    db = TestingSessionLocal()
    user = User(
        email="agent@example.com",
        full_name="Agent User",
        password_hash=get_password_hash("agent123"),
        role=UserRole.AGENT,
        active=True
    )
    db.add(user)
    db.commit()
    
    try:
        # Login as agent
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "agent@example.com", "password": "agent123"}
        )
        agent_token = login_response.json()["access_token"]
        
        # Try to create user (should fail)
        response = client.post(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={
                "email": "unauthorized@example.com",
                "full_name": "Unauthorized User",
                "password": "pass123",
                "role": "agent",
                "active": True
            }
        )
        assert response.status_code == 403
        assert "Not enough permissions" in response.json()["detail"]
        
    finally:
        # Cleanup
        db.delete(user)
        db.commit()
        db.close()

def test_non_admin_cannot_list_users():
    """Test that non-admin users cannot list users"""
    db = TestingSessionLocal()
    manager = User(
        email="manager@example.com",
        full_name="Manager User",
        password_hash=get_password_hash("manager123"),
        role=UserRole.MANAGER,
        active=True
    )
    db.add(manager)
    db.commit()
    
    try:
        # Login as manager
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "manager@example.com", "password": "manager123"}
        )
        manager_token = login_response.json()["access_token"]
        
        # Try to list users (should fail)
        response = client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 403
        
    finally:
        db.delete(manager)
        db.commit()
        db.close()

def test_non_admin_cannot_update_page_access():
    """Test that non-admin users cannot update page access"""
    db = TestingSessionLocal()
    
    # Create admin and agent users
    admin = User(
        email="admin2@example.com",
        full_name="Admin User 2",
        password_hash=get_password_hash("admin123"),
        role=UserRole.ADMIN,
        active=True
    )
    agent = User(
        email="agent2@example.com",
        full_name="Agent User 2",
        password_hash=get_password_hash("agent123"),
        role=UserRole.AGENT,
        active=True
    )
    db.add(admin)
    db.add(agent)
    db.commit()
    db.refresh(admin)
    db.refresh(agent)
    
    try:
        # Login as agent
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "agent2@example.com", "password": "agent123"}
        )
        agent_token = login_response.json()["access_token"]
        
        # Try to update page access (should fail)
        response = client.put(
            f"/api/v1/users/{admin.id}/page-access/candidates?has_access=false",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 403
        
    finally:
        db.delete(admin)
        db.delete(agent)
        db.commit()
        db.close()

def test_viewer_cannot_access_candidates_api():
    """Test that viewer without candidates access cannot access candidates API"""
    db = TestingSessionLocal()
    viewer = User(
        email="viewer@example.com",
        full_name="Viewer User",
        password_hash=get_password_hash("viewer123"),
        role=UserRole.VIEWER,
        active=True
    )
    db.add(viewer)
    db.commit()
    
    try:
        # Login as viewer
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "viewer@example.com", "password": "viewer123"}
        )
        viewer_token = login_response.json()["access_token"]
        
        # Try to access candidates (should fail)
        response = client.get(
            "/api/v1/candidates/",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403
        assert "Access denied to candidates page" in response.json()["detail"]
        
    finally:
        db.delete(viewer)
        db.commit()
        db.close()

def test_agent_cannot_access_calls_without_permission():
    """Test that agent without calls access cannot access calls API"""
    db = TestingSessionLocal()
    agent = User(
        email="agent3@example.com",
        full_name="Agent User 3",
        password_hash=get_password_hash("agent123"),
        role=UserRole.AGENT,
        active=True
    )
    db.add(agent)
    db.commit()
    
    # Remove default calls access for this agent
    calls_access = UserPageAccess(
        user_id=agent.id,
        page_name=PageName.CALLS,
        has_access=False
    )
    db.add(calls_access)
    db.commit()
    
    try:
        # Login as agent
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "agent3@example.com", "password": "agent123"}
        )
        agent_token = login_response.json()["access_token"]
        
        # Try to access calls (should fail)
        response = client.get(
            "/api/v1/calls/",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 403
        assert "Access denied to calls page" in response.json()["detail"]
        
    finally:
        db.delete(calls_access)
        db.delete(agent)
        db.commit()
        db.close()

# ===== PER-USER PAGE ACCESS TESTS =====

def test_update_user_page_access_grant(admin_token):
    """Test granting page access to a user"""
    # Create a test user
    db = TestingSessionLocal()
    test_user = User(
        email="testaccess@example.com",
        full_name="Test Access User",
        password_hash=get_password_hash("test123"),
        role=UserRole.VIEWER,
        active=True
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    
    try:
        # Grant candidates access
        response = client.put(
            f"/api/v1/users/{test_user.id}/page-access/candidates?has_access=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert "Page access updated" in response.json()["message"]
        
        # Verify access was granted in database
        access_record = db.query(UserPageAccess).filter(
            UserPageAccess.user_id == test_user.id,
            UserPageAccess.page_name == PageName.CANDIDATES
        ).first()
        assert access_record is not None
        assert access_record.has_access is True
        
    finally:
        # Cleanup
        db.query(UserPageAccess).filter(UserPageAccess.user_id == test_user.id).delete()
        db.delete(test_user)
        db.commit()
        db.close()

def test_update_user_page_access_revoke(admin_token):
    """Test revoking page access from a user"""
    # Create a test user with existing access
    db = TestingSessionLocal()
    test_user = User(
        email="testrevoke@example.com",
        full_name="Test Revoke User",
        password_hash=get_password_hash("test123"),
        role=UserRole.AGENT,  # Agent has calls access by default
        active=True
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    
    try:
        # Revoke calls access
        response = client.put(
            f"/api/v1/users/{test_user.id}/page-access/calls?has_access=false",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert "Page access updated" in response.json()["message"]
        
        # Verify access was revoked in database
        access_record = db.query(UserPageAccess).filter(
            UserPageAccess.user_id == test_user.id,
            UserPageAccess.page_name == PageName.CALLS
        ).first()
        assert access_record is not None
        assert access_record.has_access is False
        
    finally:
        # Cleanup
        db.query(UserPageAccess).filter(UserPageAccess.user_id == test_user.id).delete()
        db.delete(test_user)
        db.commit()
        db.close()

def test_update_user_page_access_nonexistent_user(admin_token):
    """Test updating page access for non-existent user"""
    response = client.put(
        "/api/v1/users/99999/page-access/candidates?has_access=true",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 404
    assert "User not found" in response.json()["detail"]

def test_update_user_page_access_invalid_page(admin_token, admin_user):
    """Test updating access for invalid page name"""
    response = client.put(
        f"/api/v1/users/{admin_user.id}/page-access/invalid_page?has_access=true",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 422  # Validation error

def test_user_permissions_with_overrides():
    """Test that per-user overrides work correctly"""
    db = TestingSessionLocal()
    
    # Create a viewer user
    viewer = User(
        email="vieweroverride@example.com",
        full_name="Viewer Override",
        password_hash=get_password_hash("viewer123"),
        role=UserRole.VIEWER,
        active=True
    )
    db.add(viewer)
    db.commit()
    db.refresh(viewer)
    
    # Grant candidates access (override default viewer permissions)
    access_override = UserPageAccess(
        user_id=viewer.id,
        page_name=PageName.CANDIDATES,
        has_access=True
    )
    db.add(access_override)
    db.commit()
    
    try:
        # Login as viewer
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "vieweroverride@example.com", "password": "viewer123"}
        )
        viewer_token = login_response.json()["access_token"]
        
        # Should now be able to access candidates
        response = client.get(
            "/api/v1/candidates/",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 200
        
        # Verify permissions endpoint shows the override
        perm_response = client.get(
            "/api/v1/users/me/permissions",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert perm_response.status_code == 200
        permissions = perm_response.json()["permissions"]
        assert permissions["candidates"] is True  # Override
        assert permissions.get("calls", False) is False  # Default viewer permission
        
    finally:
        # Cleanup
        db.delete(access_override)
        db.delete(viewer)
        db.commit()
        db.close()

def test_audit_log_for_page_access_changes(admin_token):
    """Test that page access changes are logged in audit log"""
    # Create a test user
    db = TestingSessionLocal()
    test_user = User(
        email="auditlog@example.com",
        full_name="Audit Log User",
        password_hash=get_password_hash("test123"),
        role=UserRole.VIEWER,
        active=True
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    
    try:
        # Change page access
        response = client.put(
            f"/api/v1/users/{test_user.id}/page-access/interviews?has_access=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        # Check audit logs
        audit_response = client.get(
            "/api/v1/audit-logs/recent?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert audit_response.status_code == 200
        
        # Find the page access update log entry
        logs = audit_response.json()
        page_access_log = None
        for log in logs:
            if log["action"] == "update_page_access" and log["target_user_id"] == test_user.id:
                page_access_log = log
                break
        
        assert page_access_log is not None
        assert page_access_log["metadata"]["page"] == "interviews"
        assert page_access_log["metadata"]["access_granted"] is True
        
    finally:
        # Cleanup
        db.query(UserPageAccess).filter(UserPageAccess.user_id == test_user.id).delete()
        db.delete(test_user)
        db.commit()
        db.close()
