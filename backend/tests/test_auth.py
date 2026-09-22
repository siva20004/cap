import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_auth_full_cycle():
    test_email = "alex.capstone.test@gmail.com"
    test_password = "SecurePassword123!"
    
    # 1. Register
    reg_res = client.post("/api/auth/register", json={
        "first_name": "Alex",
        "last_name": "Stone",
        "email": test_email,
        "password": test_password,
        "country": "United States"
    })
    # Either 201 (new) or 400 (already created if run repeatedly)
    assert reg_res.status_code in (201, 400)
    
    # 2. Login
    login_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": test_password
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == test_email
    assert data["user"]["first_name"] == "Alex"
    
    # 3. Invalid credentials test
    bad_login = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "WrongPassword999"
    })
    assert bad_login.status_code == 401
    
    # 4. Get Current User Profile via /me
    token = data["access_token"]
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    user_info = me_res.json()
    assert user_info["email"] == test_email
