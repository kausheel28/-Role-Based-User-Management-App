# AI-assisted: see ai-assist.md
"""
Comprehensive permission and access control tests
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
from app.models.user_page_access import UserPageAccess, PageName

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_permissions.db"
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
    if os.path.exists("./test_permissions.db"):
        os.remove("./test_permissions.db")

@pytest.fixture
def admin_user():
    db = TestingSessionLocal()
    user = User(
        email="admin@test.com",
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
        json={"email": "admin@test.com", "password": "admin123"}
    )
    return response.json()["access_token"]

# ===== ROLE-BASED ACCESS TESTS =====

def test_admin_can_access_all_endpoints(admin_token):
    """Test that admin can access all protected endpoints"""
    endpoints = [
        "/api/v1/users/",
        "/api/v1/candidates/",
        "/api/v1/interviews/",
        "/api/v1/calls/",
        "/api/v1/audit-logs/recent"
    ]
    
    for endpoint in endpoints:
        response = client.get(
            endpoint,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin should access {endpoint}"

def test_manager_role_restrictions():
    """Test manager role access restrictions"""
    db = TestingSessionLocal()
    manager = User(
        email="manager@test.com",
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
            json={"email": "manager@test.com", "password": "manager123"}
        )
        manager_token = login_response.json()["access_token"]
        
        # Manager can access business endpoints
        business_endpoints = [
            "/api/v1/candidates/",
            "/api/v1/interviews/",
            "/api/v1/calls/"
        ]
        
        for endpoint in business_endpoints:
            response = client.get(
                endpoint,
                headers={"Authorization": f"Bearer {manager_token}"}
            )
            assert response.status_code == 200, f"Manager should access {endpoint}"
        
        # Manager cannot access user management
        response = client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 403, "Manager should not access user management"
        
    finally:
        db.delete(manager)
        db.commit()
        db.close()

def test_agent_role_restrictions():
    """Test agent role access restrictions"""
    db = TestingSessionLocal()
    agent = User(
        email="agent@test.com",
        full_name="Agent User",
        password_hash=get_password_hash("agent123"),
        role=UserRole.AGENT,
        active=True
    )
    db.add(agent)
    db.commit()
    
    try:
        # Login as agent
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "agent@test.com", "password": "agent123"}
        )
        agent_token = login_response.json()["access_token"]
        
        # Agent can access limited endpoints
        allowed_endpoints = [
            "/api/v1/interviews/",
            "/api/v1/calls/"
        ]
        
        for endpoint in allowed_endpoints:
            response = client.get(
                endpoint,
                headers={"Authorization": f"Bearer {agent_token}"}
            )
            assert response.status_code == 200, f"Agent should access {endpoint}"
        
        # Agent cannot access candidates by default
        response = client.get(
            "/api/v1/candidates/",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 403, "Agent should not access candidates by default"
        
    finally:
        db.delete(agent)
        db.commit()
        db.close()

def test_viewer_role_restrictions():
    """Test viewer role access restrictions"""
    db = TestingSessionLocal()
    viewer = User(
        email="viewer@test.com",
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
            json={"email": "viewer@test.com", "password": "viewer123"}
        )
        viewer_token = login_response.json()["access_token"]
        
        # Viewer cannot access most endpoints
        restricted_endpoints = [
            "/api/v1/candidates/",
            "/api/v1/interviews/",
            "/api/v1/calls/"
        ]
        
        for endpoint in restricted_endpoints:
            response = client.get(
                endpoint,
                headers={"Authorization": f"Bearer {viewer_token}"}
            )
            assert response.status_code == 403, f"Viewer should not access {endpoint}"
        
        # Viewer can access their own permissions
        response = client.get(
            "/api/v1/users/me/permissions",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 200
        
    finally:
        db.delete(viewer)
        db.commit()
        db.close()

# ===== PERMISSION OVERRIDE TESTS =====

def test_permission_override_grants_access():
    """Test that permission overrides grant access to restricted endpoints"""
    db = TestingSessionLocal()
    viewer = User(
        email="vieweroverride@test.com",
        full_name="Viewer Override",
        password_hash=get_password_hash("viewer123"),
        role=UserRole.VIEWER,
        active=True
    )
    db.add(viewer)
    db.commit()
    db.refresh(viewer)
    
    # Grant candidates access
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
            json={"email": "vieweroverride@test.com", "password": "viewer123"}
        )
        viewer_token = login_response.json()["access_token"]
        
        # Should now be able to access candidates
        response = client.get(
            "/api/v1/candidates/",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 200, "Override should grant candidates access"
        
        # Still cannot access other restricted endpoints
        response = client.get(
            "/api/v1/calls/",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403, "Should still be restricted from calls"
        
    finally:
        db.delete(access_override)
        db.delete(viewer)
        db.commit()
        db.close()

def test_permission_override_revokes_access():
    """Test that permission overrides can revoke default access"""
    db = TestingSessionLocal()
    agent = User(
        email="agentrestricted@test.com",
        full_name="Agent Restricted",
        password_hash=get_password_hash("agent123"),
        role=UserRole.AGENT,
        active=True
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    
    # Revoke calls access (agents have this by default)
    access_override = UserPageAccess(
        user_id=agent.id,
        page_name=PageName.CALLS,
        has_access=False
    )
    db.add(access_override)
    db.commit()
    
    try:
        # Login as agent
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "agentrestricted@test.com", "password": "agent123"}
        )
        agent_token = login_response.json()["access_token"]
        
        # Should not be able to access calls
        response = client.get(
            "/api/v1/calls/",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 403, "Override should revoke calls access"
        
        # Still can access interviews (default agent permission)
        response = client.get(
            "/api/v1/interviews/",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200, "Should still have interviews access"
        
    finally:
        db.delete(access_override)
        db.delete(agent)
        db.commit()
        db.close()

# ===== COMPREHENSIVE ACCESS CONTROL TESTS =====

def test_cross_role_permission_matrix():
    """Test comprehensive permission matrix across all roles and pages"""
    # Define expected permissions for each role
    role_permissions = {
        UserRole.ADMIN: {
            "dashboard": True,
            "candidates": True,
            "interviews": True,
            "calls": True,
            "settings": True,
            "user_management": True
        },
        UserRole.MANAGER: {
            "dashboard": True,
            "candidates": True,
            "interviews": True,
            "calls": True,
            "settings": True,
            "user_management": False
        },
        UserRole.AGENT: {
            "dashboard": True,
            "candidates": False,
            "interviews": True,
            "calls": True,
            "settings": True,
            "user_management": False
        },
        UserRole.VIEWER: {
            "dashboard": True,
            "candidates": False,
            "interviews": False,
            "calls": False,
            "settings": True,
            "user_management": False
        }
    }
    
    endpoint_mapping = {
        "candidates": "/api/v1/candidates/",
        "interviews": "/api/v1/interviews/",
        "calls": "/api/v1/calls/"
    }
    
    db = TestingSessionLocal()
    
    for role, expected_perms in role_permissions.items():
        # Create user with this role
        user = User(
            email=f"{role.value}@matrix.com",
            full_name=f"{role.value.title()} User",
            password_hash=get_password_hash("test123"),
            role=role,
            active=True
        )
        db.add(user)
        db.commit()
        
        try:
            # Login as this user
            login_response = client.post(
                "/api/v1/auth/login",
                json={"email": f"{role.value}@matrix.com", "password": "test123"}
            )
            token = login_response.json()["access_token"]
            
            # Test permissions endpoint
            perm_response = client.get(
                "/api/v1/users/me/permissions",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert perm_response.status_code == 200
            actual_perms = perm_response.json()["permissions"]
            
            # Verify permissions match expected
            for page, expected_access in expected_perms.items():
                if page in endpoint_mapping:
                    endpoint = endpoint_mapping[page]
                    response = client.get(
                        endpoint,
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    
                    if expected_access:
                        assert response.status_code == 200, f"{role.value} should access {page}"
                    else:
                        assert response.status_code == 403, f"{role.value} should not access {page}"
                
                # Also check permissions API response
                actual_access = actual_perms.get(page, False)
                assert actual_access == expected_access, f"{role.value} {page} permission mismatch"
        
        finally:
            db.delete(user)
            db.commit()
    
    db.close()

def test_token_expiration_handling():
    """Test behavior with expired/invalid tokens"""
    # Test with completely invalid token
    response = client.get(
        "/api/v1/candidates/",
        headers={"Authorization": "Bearer invalid_token_12345"}
    )
    assert response.status_code == 401
    
    # Test with malformed authorization header
    response = client.get(
        "/api/v1/candidates/",
        headers={"Authorization": "InvalidFormat token_here"}
    )
    assert response.status_code == 401
    
    # Test with missing authorization header
    response = client.get("/api/v1/candidates/")
    assert response.status_code == 401

def test_concurrent_permission_changes(admin_token):
    """Test that permission changes take effect immediately"""
    db = TestingSessionLocal()
    test_user = User(
        email="concurrent@test.com",
        full_name="Concurrent Test User",
        password_hash=get_password_hash("test123"),
        role=UserRole.VIEWER,
        active=True
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    
    try:
        # Login as test user
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "concurrent@test.com", "password": "test123"}
        )
        user_token = login_response.json()["access_token"]
        
        # Initially cannot access candidates
        response = client.get(
            "/api/v1/candidates/",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403
        
        # Admin grants access
        admin_response = client.put(
            f"/api/v1/users/{test_user.id}/page-access/candidates?has_access=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_response.status_code == 200
        
        # User should now have access (same token)
        response = client.get(
            "/api/v1/candidates/",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200, "Permission change should take effect immediately"
        
        # Verify through permissions endpoint
        perm_response = client.get(
            "/api/v1/users/me/permissions",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert perm_response.status_code == 200
        permissions = perm_response.json()["permissions"]
        assert permissions["candidates"] is True
        
    finally:
        # Cleanup
        db.query(UserPageAccess).filter(UserPageAccess.user_id == test_user.id).delete()
        db.delete(test_user)
        db.commit()
        db.close()
