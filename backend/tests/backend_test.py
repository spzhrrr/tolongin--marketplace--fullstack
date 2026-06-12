"""End-to-end backend API tests for Tolongin (NestJS + Prisma).
Run: pytest /app/backend/tests/backend_test.py -v --tb=short
"""
import os
import time
import uuid
import pytest
import requests

# Use preview URL (proxies /api to backend port 8001)
BASE_URL = os.environ.get("BACKEND_BASE_URL", "https://a98cf157-f260-4857-a561-a6de99fc5d38.preview.emergentagent.com").rstrip("/") + "/api"

BUYER = {"email": "buyer@tolongin.com", "password": "Buyer@123"}
SELLER = {"email": "seller@tolongin.com", "password": "Seller@123"}
ADMIN = {"email": "admin@tolongin.com", "password": "Admin@123"}


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def s():
    return requests.Session()


def _login(s, creds):
    r = s.post(f"{BASE_URL}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def buyer_tokens(s):
    return _login(s, BUYER)


@pytest.fixture(scope="session")
def seller_tokens(s):
    return _login(s, SELLER)


@pytest.fixture(scope="session")
def admin_tokens(s):
    return _login(s, ADMIN)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- public catalog ----------
class TestPublicCatalog:
    def test_categories(self, s):
        r = s.get(f"{BASE_URL}/categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 6
        assert "name" in data[0] and "slug" in data[0]

    def test_services_paginated(self, s):
        r = s.get(f"{BASE_URL}/services?page=1&limit=20")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and "meta" in body
        assert isinstance(body["data"], list)
        assert len(body["data"]) >= 8, f"expected >=8 services, got {len(body['data'])}"

    def test_services_featured(self, s):
        r = s.get(f"{BASE_URL}/services/featured")
        assert r.status_code == 200
        data = r.json()
        # may be array directly or wrapped
        if isinstance(data, dict) and "data" in data:
            data = data["data"]
        assert isinstance(data, list)

    def test_jobs_open(self, s):
        r = s.get(f"{BASE_URL}/jobs?status=OPEN")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and "meta" in body
        assert isinstance(body["data"], list)


# ---------- auth ----------
class TestAuth:
    def test_login_success(self, s):
        r = s.post(f"{BASE_URL}/auth/login", json=BUYER)
        assert r.status_code == 200
        b = r.json()
        assert "token" in b and "refreshToken" in b and "user" in b
        assert b["user"]["email"] == BUYER["email"]

    def test_login_wrong_password(self, s):
        r = s.post(f"{BASE_URL}/auth/login", json={"email": BUYER["email"], "password": "WRONG@xyz1"})
        assert r.status_code == 401
        body = r.json()
        assert "message" in body or "error" in body

    def test_refresh_valid(self, s, buyer_tokens):
        r = s.post(f"{BASE_URL}/auth/refresh", json={"refreshToken": buyer_tokens["refreshToken"]})
        assert r.status_code == 200
        b = r.json()
        assert "token" in b and "refreshToken" in b

    def test_refresh_invalid(self, s):
        # Use a fresh session so a previously-set cookie does not take precedence over the body
        fresh = requests.Session()
        r = fresh.post(f"{BASE_URL}/auth/refresh", json={"refreshToken": "this.is.not.valid"})
        assert r.status_code == 401

    def test_logout_blacklists_token(self, s):
        # use a dedicated login so we don't break shared session tokens
        tokens = _login(s, BUYER)
        tok = tokens["token"]
        # /me works
        r1 = s.get(f"{BASE_URL}/auth/me", headers=auth(tok))
        assert r1.status_code == 200
        # logout
        r2 = s.post(f"{BASE_URL}/auth/logout", headers=auth(tok))
        assert r2.status_code in (200, 201, 204)
        # /me should be 401 now
        r3 = s.get(f"{BASE_URL}/auth/me", headers=auth(tok))
        assert r3.status_code == 401, f"token still valid after logout: {r3.status_code}"

    def test_register_both_role_rejected(self, s):
        payload = {
            "name": "TEST Both",
            "email": f"TEST_both_{uuid.uuid4().hex[:6]}@tolongin.com",
            "password": "Pass@1234",
            "role": "BOTH",
        }
        r = s.post(f"{BASE_URL}/auth/register", json=payload)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"

    def test_register_weak_password_rejected(self, s):
        payload = {
            "name": "TEST Weak",
            "email": f"TEST_weak_{uuid.uuid4().hex[:6]}@tolongin.com",
            "password": "password1",  # no special char
            "role": "BUYER",
        }
        r = s.post(f"{BASE_URL}/auth/register", json=payload)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"

    def test_register_success_buyer(self, s):
        payload = {
            "name": "TEST Buyer",
            "email": f"TEST_buyer_{uuid.uuid4().hex[:8]}@tolongin.com",
            "password": "Pass@1234",
            "role": "BUYER",
        }
        r = s.post(f"{BASE_URL}/auth/register", json=payload)
        assert r.status_code in (200, 201), f"got {r.status_code}: {r.text}"
        b = r.json()
        assert "token" in b and "refreshToken" in b
        assert b["user"]["email"].lower() == payload["email"].lower()

    # ---- iteration 2: cookie-based refresh, blacklist, throttler ----
    def test_login_sets_refresh_cookie(self):
        sess = requests.Session()
        r = sess.post(f"{BASE_URL}/auth/login", json=BUYER)
        assert r.status_code == 200
        # response body must still have tokens (backward compat)
        b = r.json()
        assert "token" in b and "refreshToken" in b
        # cookie tolongin_rt must be set with HttpOnly + path=/api/auth
        set_cookie = r.headers.get("set-cookie", "") or ""
        assert "tolongin_rt=" in set_cookie, f"missing refresh cookie header: {set_cookie}"
        assert "HttpOnly" in set_cookie, f"refresh cookie not HttpOnly: {set_cookie}"
        assert "Path=/api/auth" in set_cookie, f"refresh cookie wrong path: {set_cookie}"
        # session cookies jar has the cookie
        assert sess.cookies.get("tolongin_rt") is not None

    def test_refresh_with_cookie_only_empty_body(self):
        sess = requests.Session()
        sess.post(f"{BASE_URL}/auth/login", json=BUYER)
        # Empty body, only cookie present
        r = sess.post(f"{BASE_URL}/auth/refresh", json={})
        assert r.status_code == 200, f"cookie-only refresh failed: {r.status_code} {r.text}"
        b = r.json()
        assert "token" in b and "refreshToken" in b
        # cookie should be rotated (new tolongin_rt set)
        sc = r.headers.get("set-cookie", "") or ""
        assert "tolongin_rt=" in sc

    def test_refresh_with_body_backward_compat(self, s, buyer_tokens):
        # fresh session (no cookie) — should still work with body
        sess = requests.Session()
        r = sess.post(f"{BASE_URL}/auth/refresh", json={"refreshToken": buyer_tokens["refreshToken"]})
        assert r.status_code == 200, f"body-only refresh failed: {r.status_code} {r.text}"
        b = r.json()
        assert "token" in b and "refreshToken" in b

    def test_register_sets_refresh_cookie(self):
        sess = requests.Session()
        payload = {
            "name": "TEST CookieReg",
            "email": f"TEST_cookie_{uuid.uuid4().hex[:8]}@tolongin.com",
            "password": "Pass@1234",
            "role": "BUYER",
        }
        r = sess.post(f"{BASE_URL}/auth/register", json=payload)
        assert r.status_code in (200, 201), r.text
        sc = r.headers.get("set-cookie", "") or ""
        assert "tolongin_rt=" in sc
        assert "HttpOnly" in sc
        b = r.json()
        assert "token" in b and "refreshToken" in b

    def test_logout_clears_cookie_and_blacklists(self):
        sess = requests.Session()
        login = sess.post(f"{BASE_URL}/auth/login", json=BUYER).json()
        access = login["token"]
        refresh = login["refreshToken"]
        # access token works
        me1 = sess.get(f"{BASE_URL}/auth/me", headers=auth(access))
        assert me1.status_code == 200
        # logout (cookie auto-sent)
        lo = sess.post(f"{BASE_URL}/auth/logout", headers=auth(access))
        assert lo.status_code in (200, 204)
        # Set-Cookie clearing header present
        sc = lo.headers.get("set-cookie", "") or ""
        assert "tolongin_rt=" in sc and ("Expires=" in sc or "Max-Age=0" in sc or "Max-Age=-1" in sc)
        # access token now blacklisted
        me2 = sess.get(f"{BASE_URL}/auth/me", headers=auth(access))
        assert me2.status_code == 401, f"access token still valid after logout: {me2.status_code}"
        # refresh token now blacklisted (cookie was cleared; provide via body)
        rfresh = requests.Session().post(
            f"{BASE_URL}/auth/refresh", json={"refreshToken": refresh}
        )
        assert rfresh.status_code == 401, (
            f"blacklisted refresh still accepted: {rfresh.status_code} {rfresh.text}"
        )

    def test_me_alias_matches_profile(self, s, buyer_tokens):
        r1 = s.get(f"{BASE_URL}/auth/me", headers=auth(buyer_tokens["token"]))
        r2 = s.get(f"{BASE_URL}/auth/profile", headers=auth(buyer_tokens["token"]))
        assert r1.status_code == 200 and r2.status_code == 200
        # email should match between the two endpoints
        e1 = r1.json().get("email") or r1.json().get("user", {}).get("email")
        e2 = r2.json().get("email") or r2.json().get("user", {}).get("email")
        assert e1 == e2 == BUYER["email"]


# ---------- orders ----------
class TestOrders:
    def test_orders_buyer_default(self, s, buyer_tokens):
        r = s.get(f"{BASE_URL}/orders", headers=auth(buyer_tokens["token"]))
        assert r.status_code == 200
        d = r.json()
        if isinstance(d, dict) and "data" in d:
            d = d["data"]
        assert isinstance(d, list)

    def test_orders_role_buyer(self, s, buyer_tokens):
        r = s.get(f"{BASE_URL}/orders?role=BUYER", headers=auth(buyer_tokens["token"]))
        assert r.status_code == 200

    def test_orders_role_seller(self, s, buyer_tokens):
        r = s.get(f"{BASE_URL}/orders?role=SELLER", headers=auth(buyer_tokens["token"]))
        assert r.status_code == 200
        d = r.json()
        if isinstance(d, dict) and "data" in d:
            d = d["data"]
        assert isinstance(d, list)

    def test_create_order_as_buyer(self, s, buyer_tokens):
        # find a service id
        svc = s.get(f"{BASE_URL}/services?page=1&limit=1").json()
        sid = svc["data"][0]["id"]
        r = s.post(
            f"{BASE_URL}/orders/service/{sid}",
            headers=auth(buyer_tokens["token"]),
            json={"requirements": "TEST order from pytest", "quantity": 1},
        )
        assert r.status_code in (200, 201), f"create order failed {r.status_code}: {r.text}"
        body = r.json()
        order = body.get("data", body)
        assert "id" in order

    def test_create_order_as_admin_forbidden(self, s, admin_tokens):
        svc = s.get(f"{BASE_URL}/services?page=1&limit=1").json()
        sid = svc["data"][0]["id"]
        r = s.post(
            f"{BASE_URL}/orders/service/{sid}",
            headers=auth(admin_tokens["token"]),
            json={"requirements": "TEST", "quantity": 1},
        )
        assert r.status_code in (400, 401, 403), f"expected forbidden, got {r.status_code}: {r.text}"

    def test_order_status_machine(self, s, buyer_tokens, seller_tokens):
        # buyer creates an order
        svc = s.get(f"{BASE_URL}/services?page=1&limit=20").json()
        # find a service that belongs to the seeded seller
        sid = svc["data"][0]["id"]
        cr = s.post(
            f"{BASE_URL}/orders/service/{sid}",
            headers=auth(buyer_tokens["token"]),
            json={"requirements": "TEST state machine", "quantity": 1},
        )
        assert cr.status_code in (200, 201), cr.text
        order = cr.json().get("data", cr.json())
        oid = order["id"]

        # seller tries to skip ACCEPTED -> IN_PROGRESS
        bad = s.post(
            f"{BASE_URL}/orders/{oid}/status",
            headers=auth(seller_tokens["token"]),
            json={"status": "IN_PROGRESS"},
        )
        assert bad.status_code in (400, 403, 409), f"expected rejection, got {bad.status_code}: {bad.text}"

        # seller accepts
        ok = s.post(
            f"{BASE_URL}/orders/{oid}/status",
            headers=auth(seller_tokens["token"]),
            json={"status": "ACCEPTED"},
        )
        assert ok.status_code in (200, 201), f"accept failed {ok.status_code}: {ok.text}"


# ---------- compat layer ----------
class TestCompat:
    def test_favorites_flow(self, s, buyer_tokens):
        h = auth(buyer_tokens["token"])
        r = s.get(f"{BASE_URL}/favorites", headers=h)
        assert r.status_code == 200
        # find a service
        svc = s.get(f"{BASE_URL}/services?page=1&limit=1").json()
        sid = svc["data"][0]["id"]
        add = s.post(f"{BASE_URL}/favorites/{sid}", headers=h)
        assert add.status_code in (200, 201), add.text
        listed = s.get(f"{BASE_URL}/favorites", headers=h).json()
        items = listed if isinstance(listed, list) else listed.get("data", [])
        ids = [(it.get("id") or it.get("serviceId") or it.get("service", {}).get("id")) for it in items]
        assert sid in ids, f"added service not in favorites list: {ids}"
        rem = s.delete(f"{BASE_URL}/favorites/{sid}", headers=h)
        assert rem.status_code in (200, 204), rem.text

    def test_integrations_status(self, s):
        r = s.get(f"{BASE_URL}/integrations/status")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, dict)
        # we expect mock providers
        text = str(body).lower()
        assert "mock" in text

    def test_midtrans_config(self, s):
        r = s.get(f"{BASE_URL}/payments/midtrans/config")
        assert r.status_code == 200
        b = r.json()
        assert not b.get("enabled")
        assert b.get("mock")


# ---------- admin ----------
class TestAdmin:
    def test_admin_stats_admin(self, s, admin_tokens):
        r = s.get(f"{BASE_URL}/admin/stats", headers=auth(admin_tokens["token"]))
        assert r.status_code == 200
        b = r.json()
        assert isinstance(b, dict) and len(b) > 0

    def test_admin_stats_buyer_forbidden(self, s, buyer_tokens):
        r = s.get(f"{BASE_URL}/admin/stats", headers=auth(buyer_tokens["token"]))
        assert r.status_code in (401, 403)

    def test_admin_users_no_password(self, s, admin_tokens):
        r = s.get(f"{BASE_URL}/admin/users", headers=auth(admin_tokens["token"]))
        assert r.status_code == 200
        b = r.json()
        users = b if isinstance(b, list) else b.get("data", [])
        assert len(users) >= 3
        for u in users:
            assert "password" not in u, "password field exposed!"

    def test_admin_kyc_pending(self, s, admin_tokens):
        r = s.get(f"{BASE_URL}/admin/kyc?status=pending", headers=auth(admin_tokens["token"]))
        assert r.status_code == 200
        b = r.json()
        # tolerate list or wrapped
        data = b if isinstance(b, list) else b.get("data", [])
        assert isinstance(data, list)


# ---------- throttler (must run LAST: exhausts auth/login bucket) ----------
class TestZThrottler:
    def test_throttler_login_burst(self):
        # 35 rapid bad-credential logins should start returning 429
        sess = requests.Session()
        codes = []
        for _ in range(35):
            r = sess.post(
                f"{BASE_URL}/auth/login",
                json={"email": BUYER["email"], "password": "WRONG@xyz1"},
                timeout=10,
            )
            codes.append(r.status_code)
            if r.status_code == 429:
                break
        assert 429 in codes, f"no 429 in burst: {codes}"
