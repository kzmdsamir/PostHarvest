"""Multitenancy & Authentication Isolation Tests."""
from __future__ import annotations

import pytest
from helpers import insert_completed_job, sample_posts
from backend.core.database import SessionLocal
from backend.models.user import User


def test_unauthenticated_request_returns_401(client):
    """Endpoints protected by get_current_user return 401 when no token is present."""
    resp = client.get("/api/jobs")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "auth_required"

    resp = client.post("/api/scrape", json={"urls": ["https://facebook.com/example"]})
    assert resp.status_code == 401


def test_invalid_token_returns_401(client):
    """Sending a malformed Bearer token returns 401."""
    resp = client.get("/api/jobs", headers={"Authorization": "Bearer bad-token"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "invalid_token"


def test_auth_me_returns_user_profile(authed_client):
    """GET /api/auth/me returns the current user profile."""
    resp = authed_client.get("/api/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["firebase_uid"] == "test_firebase_uid_user_a"
    assert data["email"] == "user_a@example.com"
    assert data["plan"] == "free"


def test_multitenancy_job_isolation(authed_client, client):
    """User A cannot see or access User B's jobs."""
    with SessionLocal() as db:
        user_b = User(
            firebase_uid="test_firebase_uid_user_b",
            email="user_b@example.com",
            display_name="User B",
        )
        db.add(user_b)
        db.commit()
        db.refresh(user_b)
        user_b_id = user_b.id

    # User B creates a job
    job_b_id = insert_completed_job(sample_posts(2), owner_id=user_b_id)

    # User A lists jobs -> job_b_id should NOT be in User A's list
    resp = authed_client.get("/api/jobs")
    assert resp.status_code == 200
    job_ids = [item["job_id"] for item in resp.json()["items"]]
    assert job_b_id not in job_ids

    # User A tries to view User B's job -> 404
    resp = authed_client.get(f"/api/jobs/{job_b_id}")
    assert resp.status_code == 404

    # User A tries to view User B's job posts -> 404
    resp = authed_client.get(f"/api/jobs/{job_b_id}/posts")
    assert resp.status_code == 404

    # User A tries to view User B's job stats -> 404
    resp = authed_client.get(f"/api/jobs/{job_b_id}/stats")
    assert resp.status_code == 404

    # User A tries to export User B's job -> 404
    resp = authed_client.get(f"/api/jobs/{job_b_id}/export/json")
    assert resp.status_code == 404

    # User A tries to delete User B's job -> 404
    resp = authed_client.delete(f"/api/jobs/{job_b_id}")
    assert resp.status_code == 404
