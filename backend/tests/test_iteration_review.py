"""Tests for the current review request iteration:
- Public profile endpoints (/api/users/:id, services, reviews)
- OTP email/phone verify aliases + emailVerified state propagation
- PUT /api/users/me with bio, city, phone, avatar (base64) + 10mb body limit
- Admin stats + admin-only guard
Run: pytest /app/backend/tests/test_iteration_review.py -v --tb=short
"""
import os
import requests
import pytest

BASE_URL = "http://localhost:8001/api"

ADMIN = {"email": "admin@tolongin.com", "password": "Admin@123"}
NEWBIE = {"email": "newbie@tolongin.com", "password": "User@123"}
ANDI = {"email": "andi@tolongin.com", "password": "User@123"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.text}"
    return r.json()


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Public catalog basics ----------
class TestCatalog:
    def test_categories_10(self):
        r = requests.get(f"{BASE_URL}/categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 10

    def test_services_paginated_20plus(self):
        r = requests.get(f"{BASE_URL}/services?limit=100")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and ("total" in body or "meta" in body)
        assert len(body["data"]) >= 20


# ---------- Public Profile endpoints ----------
class TestPublicProfile:
    @pytest.fixture(scope="class")
    def seller_id(self):
        r = requests.get(f"{BASE_URL}/services?limit=1")
        return r.json()["data"][0]["sellerId"]

    def test_user_public_profile(self, seller_id):
        r = requests.get(f"{BASE_URL}/users/{seller_id}")
        assert r.status_code == 200, r.text
        body = r.json()
        # Some APIs wrap; normalise
        u = body.get("data", body) if isinstance(body, dict) else body
        assert "id" in u and u["id"] == seller_id
        assert "password" not in u, "password field leaked!"
        # OTP-related fields must NOT be exposed
        for forbidden in [
            "emailOtp", "phoneOtp", "passwordOtp",
            "emailOtpExpiresAt", "phoneOtpExpiresAt", "passwordOtpExpiresAt",
        ]:
            assert forbidden not in u, f"otp field {forbidden} leaked: {u}"

    def test_user_services(self, seller_id):
        r = requests.get(f"{BASE_URL}/users/{seller_id}/services")
        assert r.status_code == 200
        body = r.json()
        items = body if isinstance(body, list) else body.get("data", [])
        assert isinstance(items, list) and len(items) >= 1
        # seller relation should be populated on each service
        first = items[0]
        assert "seller" in first, f"seller relation missing on service: {first.keys()}"
        seller = first["seller"]
        assert isinstance(seller, dict) and seller.get("id") == seller_id

    def test_user_reviews(self, seller_id):
        r = requests.get(f"{BASE_URL}/users/{seller_id}/reviews")
        assert r.status_code == 200
        body = r.json()
        items = body if isinstance(body, list) else body.get("data", [])
        assert isinstance(items, list)


# ---------- Auth login states ----------
class TestLoginStates:
    def test_admin_login_role_admin(self):
        b = _login(ADMIN)
        assert b["user"]["role"] == "ADMIN"
        assert "token" in b

    def test_newbie_email_unverified(self):
        b = _login(NEWBIE)
        assert b["user"]["emailVerified"] is False


# ---------- OTP verification flow + state propagation ----------
class TestOtpFlow:
    def test_email_request_verify_propagates(self):
        b = _login(NEWBIE)
        tok = b["token"]
        req = requests.post(
            f"{BASE_URL}/verification/email/request",
            headers=auth(tok),
            json={},
        )
        assert req.status_code in (200, 201), req.text
        body = req.json()
        assert "demoOtp" in body
        otp = str(body["demoOtp"])
        assert len(otp) == 6

        v = requests.post(
            f"{BASE_URL}/verification/email/verify",
            headers=auth(tok),
            json={"otp": otp},
        )
        assert v.status_code in (200, 201), v.text
        vb = v.json()
        # ok=true semantics
        assert vb.get("ok") is True or vb.get("verified") is True or vb.get("success") is True, vb

        # /auth/me should show emailVerified=true now
        me = requests.get(f"{BASE_URL}/auth/me", headers=auth(tok))
        assert me.status_code == 200
        mu = me.json()
        u = mu.get("user", mu)
        assert u.get("emailVerified") is True, f"emailVerified did not propagate: {u}"

    def test_phone_request_verify_routes_exist(self):
        b = _login(NEWBIE)
        tok = b["token"]
        req = requests.post(
            f"{BASE_URL}/verification/phone/request",
            headers=auth(tok),
            json={"phone": "+6281234567000"},
        )
        assert req.status_code != 404, f"phone/request 404: {req.text}"
        assert req.status_code in (200, 201), req.text
        otp = str(req.json().get("demoOtp"))

        v = requests.post(
            f"{BASE_URL}/verification/phone/verify",
            headers=auth(tok),
            json={"otp": otp},
        )
        assert v.status_code != 404, f"phone/verify 404: {v.text}"
        assert v.status_code in (200, 201), v.text


# ---------- Update profile (bio, city, phone, avatar base64) ----------
class TestUpdateProfile:
    def test_put_users_me_updates_bio_city_phone(self):
        b = _login(ANDI)
        tok = b["token"]
        payload = {
            "name": "Andi Pratama",
            "bio": "TEST bio iteration review",
            "city": "Jakarta Utara",
            "phone": "+6281200000001",
        }
        r = requests.put(f"{BASE_URL}/users/me", headers=auth(tok), json=payload)
        assert r.status_code in (200, 201), f"PUT /users/me failed: {r.status_code} {r.text}"
        body = r.json()
        u = body.get("data", body)
        u = u.get("user", u) if isinstance(u, dict) else u
        assert u.get("bio") == payload["bio"], f"bio not saved: {u}"
        assert u.get("city") == payload["city"], f"city not saved: {u}"
        assert u.get("phone") == payload["phone"], f"phone not saved: {u}"

        # Verify persistence via /auth/me
        me = requests.get(f"{BASE_URL}/auth/me", headers=auth(tok))
        mu = me.json()
        mu = mu.get("user", mu)
        assert mu.get("bio") == payload["bio"]
        assert mu.get("city") == payload["city"]

    def test_put_users_me_accepts_base64_avatar(self):
        b = _login(ANDI)
        tok = b["token"]
        # 1x1 PNG
        avatar = (
            "data:image/png;base64,"
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAen63NgAAAAASUVORK5CYII="
        )
        r = requests.put(
            f"{BASE_URL}/users/me",
            headers=auth(tok),
            json={"avatar": avatar},
        )
        assert r.status_code in (200, 201), f"avatar update failed: {r.status_code} {r.text[:300]}"
        body = r.json()
        u = body.get("data", body)
        u = u.get("user", u) if isinstance(u, dict) else u
        assert u.get("avatar", "").startswith("data:image/"), f"avatar not stored: {u.get('avatar', '')[:60]}"

    def test_put_users_me_body_limit_10mb(self):
        """Send a payload close to 5MB to ensure body limit is well above 1mb default."""
        b = _login(ANDI)
        tok = b["token"]
        # 5MB base64 string (within 10mb limit)
        big_b64 = "A" * (5 * 1024 * 1024)
        avatar = f"data:image/png;base64,{big_b64}"
        r = requests.put(
            f"{BASE_URL}/users/me",
            headers=auth(tok),
            json={"avatar": avatar},
            timeout=30,
        )
        # We don't necessarily need the server to *accept* this gigantic value as a valid avatar,
        # but the body must NOT be rejected with 413 (Payload Too Large).
        assert r.status_code != 413, f"Body limit too small (413): backend rejected ~5MB body"


# ---------- Admin stats + RBAC ----------
class TestAdminStats:
    def test_admin_stats_keys(self):
        b = _login(ADMIN)
        r = requests.get(f"{BASE_URL}/admin/stats", headers=auth(b["token"]))
        assert r.status_code == 200, r.text
        data = r.json()
        # Expect a flat dict; allow {data:{}} wrapping
        d = data.get("data", data) if isinstance(data, dict) else data
        keys = set(d.keys())
        expected = {"users", "services", "jobs", "orders"}
        missing = expected - keys
        assert not missing, f"admin stats missing keys: {missing}, got: {keys}"

    def test_admin_stats_non_admin_forbidden(self):
        b = _login(NEWBIE)
        r = requests.get(f"{BASE_URL}/admin/stats", headers=auth(b["token"]))
        assert r.status_code in (401, 403)
