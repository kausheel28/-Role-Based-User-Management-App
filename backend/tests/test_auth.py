# AI-assisted: see ai-assist.md
import pytest
from app.core.security import get_password_hash
from app.models.user import User, UserRole

def test_login_success(test_client, admin_user):
    """Test successful login with valid credentials"""
    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    
    # Verify token is valid
    token = data["access_token"]
    me_response = test_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_response.status_code == 200

def test_login_invalid_email():
    """Test login with non-existent email"""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "testpass123"}
    )
    assert response.status_code == 401
    assert "detail" in response.json()

def test_login_invalid_password(test_user):
    """Test login with wrong password"""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert "detail" in response.json()

def test_login_inactive_user():
    """Test login with inactive user account"""
    db = TestingSessionLocal()
    inactive_user = User(
        email="inactive@example.com",
        full_name="Inactive User",
        password_hash=get_password_hash("testpass123"),
        role=UserRole.VIEWER,
        active=False  # Inactive user
    )
    db.add(inactive_user)
    db.commit()
    
    try:
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "inactive@example.com", "password": "testpass123"}
        )
        assert response.status_code == 400
        assert "Inactive user" in response.json()["detail"]
    finally:
        db.delete(inactive_user)
        db.commit()
        db.close()

def test_login_malformed_request():
    """Test login with malformed JSON"""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com"}  # Missing password
    )
    assert response.status_code == 422  # Validation error

def test_get_current_user(test_user):
    """Test getting current user with valid token"""
    # First login to get token
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "testpass123"}
    )
    token = login_response.json()["access_token"]
    
    # Get current user
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["full_name"] == "Test User"
    assert data["role"] == "admin"
    assert data["active"] is True

def test_unauthorized_access_no_token():
    """Test accessing protected endpoint without token"""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

def test_unauthorized_access_invalid_token():
    """Test accessing protected endpoint with invalid token"""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_token_here"}
    )
    assert response.status_code == 401

def test_unauthorized_access_malformed_header():
    """Test accessing protected endpoint with malformed auth header"""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "InvalidFormat token_here"}
    )
    assert response.status_code == 401

def test_logout_success(test_user):
    """Test successful logout"""
    # First login
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "testpass123"}
    )
    token = login_response.json()["access_token"]
    
    # Logout
    response = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert "message" in response.json()

def test_refresh_token_success(test_user):
    """Test token refresh functionality"""
    # First login
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "testpass123"}
    )
    assert login_response.status_code == 200
    
    # Note: Refresh token testing would require cookie handling
    # This is a basic structure for refresh token testing
    # In a full implementation, we would test the refresh endpoint
