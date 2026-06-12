"""Iteration 4 retest:
- Verify backend GET /api/users/:id strictly removes ALL forbidden fields.
- Verify GET /api/users/:id/services still has seller relation populated (regression).
Run: pytest /app/backend/tests/test_iteration4_retest.py -v --tb=short
"""
import os
import requests

# Public URL per review request
BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://b19483c8-7c29-43f5-b90c-ad90514d3b12.preview.emergentagent.com",
).rstrip("/") + "/api"

FORBIDDEN = [
    "emailOtpExpiresAt",
    "phoneOtpExpiresAt",
    "ktpNumber",
    "ktpPhoto",
    "ktpSelfie",
    "ktpRejectedReason",
    "ktpSubmittedAt",
    "balance",
    "isBanned",
    "bannedReason",
    "password",
    "emailOtp",
    "phoneOtp",
]

REQUIRED = [
    "id",
    "name",
    "avatar",
    "role",
    "bio",
    "city",
    "rating",
    "reviewCount",
    "completedOrders",
    "verified",
    "createdAt",
]


def _first_seller_id():
    r = requests.get(f"{BASE_URL}/services?limit=1", timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["data"][0]["sellerId"]


def test_public_profile_no_forbidden_fields():
    sid = _first_seller_id()
    r = requests.get(f"{BASE_URL}/users/{sid}", timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    u = body.get("data", body) if isinstance(body, dict) else body
    leaked = [f for f in FORBIDDEN if f in u]
    assert not leaked, f"Forbidden fields leaked: {leaked}. Response keys: {list(u.keys())}"


def test_public_profile_has_required_fields():
    sid = _first_seller_id()
    r = requests.get(f"{BASE_URL}/users/{sid}", timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    u = body.get("data", body) if isinstance(body, dict) else body
    missing = [f for f in REQUIRED if f not in u]
    assert not missing, f"Required fields missing: {missing}. Response keys: {list(u.keys())}"


def test_user_services_seller_relation_populated():
    sid = _first_seller_id()
    r = requests.get(f"{BASE_URL}/users/{sid}/services", timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    items = body if isinstance(body, list) else body.get("data", [])
    assert isinstance(items, list) and len(items) >= 1, f"No services returned: {body}"
    first = items[0]
    assert "seller" in first, f"seller relation missing on service. keys={list(first.keys())}"
    seller = first["seller"]
    assert isinstance(seller, dict) and seller.get("id") == sid, f"unexpected seller: {seller}"
