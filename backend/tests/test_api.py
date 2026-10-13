import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "AI Bug Triage System" in data["app"]

def test_login_demo_admin():
    res = client.post("/api/auth/login", json={
        "email": "admin@bugtriage.io",
        "password": "AdminPass123!",
        "role_requested": "admin"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"
    assert data["user"]["email"] == "admin@bugtriage.io"

def test_login_demo_developer():
    res = client.post("/api/auth/login", json={
        "email": "dev@bugtriage.io",
        "password": "DevPass123!",
        "role_requested": "developer"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "developer"

def test_login_role_mismatch_rejected():
    res = client.post("/api/auth/login", json={
        "email": "reporter@bugtriage.io",
        "password": "ReporterPass123!",
        "role_requested": "admin"  # Mismatch! Reporter trying to login as admin
    })
    assert res.status_code == 403
    assert "Role mismatch" in res.json()["detail"]

def test_get_bugs_authenticated():
    # Login as admin
    login_res = client.post("/api/auth/login", json={
        "email": "admin@bugtriage.io",
        "password": "AdminPass123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/bugs", headers=headers)
    assert res.status_code == 200
    bugs = res.json()
    assert len(bugs) >= 8
    first_bug = bugs[0]
    assert "bug_code" in first_bug
    assert first_bug["bug_code"].startswith("BUG-")

def test_report_new_bug_with_ai_triage():
    # Login as reporter
    login_res = client.post("/api/auth/login", json={
        "email": "reporter@bugtriage.io",
        "password": "ReporterPass123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "SQL Injection in User Search Parameter",
        "description": "User search query concatenates unescaped raw string into SELECT query, allowing SQL injection.",
        "language": "Python",
        "framework": "SQLAlchemy",
        "steps_to_reproduce": "Pass ' OR 1=1 -- into search bar",
        "expected_behavior": "Input is parameterized and safely escaped",
        "actual_behavior": "Executes malicious statement",
        "error_trace": "OperationalError: syntax error at or near 'OR'",
        "environment_info": "Staging",
        "code_snippet": "def search_users(q):\n    return db.execute(f'SELECT * FROM users WHERE name = {q}')"
    }

    res = client.post("/api/bugs", json=payload, headers=headers)
    assert res.status_code == 200
    bug = res.json()
    assert bug["title"] == payload["title"]
    assert bug["bug_code"].startswith("BUG-")
    assert bug["ai_analysis"] is not None
    assert bug["ai_analysis"]["recommended_severity"] in ["P0", "P1", "P2"]
    assert "recommended_code_diff" in bug["ai_analysis"]

def test_analytics_overview():
    res = client.get("/api/stats/overview")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_bugs"] >= 8
    assert stats["critical_bugs"] >= 1
    assert stats["ai_accuracy_percent"] > 0

def test_analytics_charts():
    res = client.get("/api/stats/charts")
    assert res.status_code == 200
    charts = res.json()
    assert "severity_distribution" in charts
    assert "bugs_by_team" in charts
    assert len(charts["bugs_by_team"]) >= 5
