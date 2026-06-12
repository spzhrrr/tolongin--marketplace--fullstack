"""Iteration 6 — review_request targeted tests:
  - Uploads (multipart, folder=avatars query param) → URL fetchable through ingress
  - Reviews identity: POST returns reviewer.name == real user (not 'Pengguna')
  - GET /api/reviews/order/:orderId includes full reviewer (id, name, avatar)
  - Orders include both buyer & seller objects regardless of caller side
"""
import io
import os
import time
import uuid
import pytest
import requests

BACKEND_BASE = os.environ.get(
    "BACKEND_BASE_URL",
    "https://a98cf157-f260-4857-a561-a6de99fc5d38.preview.emergentagent.com",
).rstrip("/")
API = BACKEND_BASE + "/api"

ADMIN = {"email": "admin@tolongin.com", "password": "Admin@123"}
SELLER = {"email": "seller@tolongin.com", "password": "Seller@123"}
BUYER = {"email": "buyer@tolongin.com", "password": "Buyer@123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    return r.json()


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


def _unwrap(d):
    return d["data"] if isinstance(d, dict) and "data" in d else d


@pytest.fixture(scope="module")
def buyer_session():
    return _login(BUYER)


@pytest.fixture(scope="module")
def seller_session():
    return _login(SELLER)


# ---------- Uploads ----------
class TestUploads:
    def test_upload_avatar_multipart(self, buyer_session):
        token = buyer_session["token"]
        # 1x1 transparent PNG
        png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
            b"\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01\x5b\xa3"
            b"\x84\xc6\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        files = {"file": (f"test_{uuid.uuid4().hex[:6]}.png", io.BytesIO(png), "image/png")}
        # folder via query param (per review request)
        r = requests.post(
            f"{API}/uploads?folder=avatars",
            headers=_auth(token),
            files=files,
            timeout=30,
        )
        assert r.status_code in (200, 201), f"upload failed: {r.status_code} {r.text}"
        body = r.json()
        body = _unwrap(body)
        assert "url" in body, f"no url in response: {body}"
        url = body["url"]
        assert url.startswith("/api/uploads/avatars/"), f"unexpected url shape: {url}"

        # Fetch via preview URL ingress
        full = BACKEND_BASE + url
        fetched = requests.get(full, timeout=20)
        assert fetched.status_code == 200, f"fetched url not 200: {fetched.status_code} {full}"
        assert len(fetched.content) > 0
        ctype = fetched.headers.get("content-type", "")
        # accept generic octet-stream too, but should not be HTML
        assert "html" not in ctype.lower(), f"served as html: {ctype}"


# ---------- Reviews identity ----------
class TestReviewsIdentity:
    def _find_completed_order_id(self, token):
        r = requests.get(f"{API}/orders", headers=_auth(token), timeout=20)
        assert r.status_code == 200, r.text
        orders = _unwrap(r.json())
        # try various status keys
        completed = [o for o in orders if (o.get("status") == "COMPLETED")]
        if not completed:
            pytest.skip("no COMPLETED order found for buyer")
        return completed[0]

    def test_create_review_returns_real_reviewer_name(self, buyer_session):
        token = buyer_session["token"]
        user_name = buyer_session["user"].get("name") or ""
        order = self._find_completed_order_id(token)
        order_id = order["id"]

        # Check if review already exists for this order
        r_existing = requests.get(f"{API}/reviews/order/{order_id}", timeout=20)
        existing = None
        if r_existing.status_code == 200:
            ex = _unwrap(r_existing.json())
            if isinstance(ex, list) and ex:
                existing = ex[0]
            elif isinstance(ex, dict) and ex.get("id"):
                existing = ex

        if existing is None:
            payload = {"orderId": order_id, "rating": 5, "comment": "TEST review by pytest iteration6 — verifying reviewer identity"}
            r = requests.post(
                f"{API}/reviews",
                headers={**_auth(token), "Content-Type": "application/json"},
                json=payload,
                timeout=20,
            )
            assert r.status_code in (200, 201), f"create review failed: {r.status_code} {r.text}"
            created = _unwrap(r.json())
            assert "reviewer" in created, f"reviewer missing from response: {created}"
            rev = created["reviewer"]
            assert isinstance(rev, dict)
            assert rev.get("name"), f"reviewer.name empty: {rev}"
            assert rev["name"] != "Pengguna", f"reviewer.name is the bug placeholder 'Pengguna'"
            if user_name:
                assert rev["name"] == user_name, f"reviewer.name {rev['name']!r} != logged-in user {user_name!r}"
        else:
            # Already reviewed — verify identity via GET path
            rev = existing.get("reviewer") or {}
            assert rev.get("name") and rev["name"] != "Pengguna"
            if user_name:
                assert rev["name"] == user_name

    def test_get_reviews_by_order_includes_full_reviewer(self, buyer_session):
        token = buyer_session["token"]
        order = self._find_completed_order_id(token)
        order_id = order["id"]
        r = requests.get(f"{API}/reviews/order/{order_id}", timeout=20)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        body = _unwrap(r.json())
        items = body if isinstance(body, list) else [body] if body else []
        if not items:
            pytest.skip("no reviews on this order")
        for it in items:
            rev = it.get("reviewer")
            assert isinstance(rev, dict), f"reviewer not a dict: {it}"
            assert rev.get("id"), f"reviewer.id missing: {rev}"
            assert rev.get("name") and rev["name"] != "Pengguna", f"reviewer.name invalid: {rev}"
            # avatar key must exist (value may be null)
            assert "avatar" in rev or "avatarUrl" in rev, f"avatar key missing from reviewer: {rev}"


# ---------- Orders include buyer + seller from both sides ----------
class TestOrdersBothSides:
    def _check(self, orders):
        for o in orders[:5]:
            assert isinstance(o.get("buyer"), dict), f"buyer missing/not dict: {list(o.keys())}"
            assert isinstance(o.get("seller"), dict), f"seller missing/not dict: {list(o.keys())}"
            assert o["buyer"].get("name") and o["seller"].get("name")

    def test_buyer_side(self, buyer_session):
        r = requests.get(f"{API}/orders", headers=_auth(buyer_session["token"]), timeout=20)
        assert r.status_code == 200
        orders = _unwrap(r.json())
        if not orders:
            pytest.skip("no buyer orders")
        self._check(orders)

    def test_seller_side(self, seller_session):
        r = requests.get(f"{API}/orders", headers=_auth(seller_session["token"]), timeout=20)
        assert r.status_code == 200
        orders = _unwrap(r.json())
        if not orders:
            pytest.skip("no seller orders")
        self._check(orders)
