"""Targeted tests for review_request items (Jan 2026 iteration).
Covers:
 - GET /api/categories >=10 categories without auth
 - Auth login for admin/seller/buyer
 - Orders include buyer AND seller objects
 - Services CRUD by seller (create/update/toggle-active/delete)
 - Services filter by sellerId
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get(
    "BACKEND_BASE_URL",
    "https://a98cf157-f260-4857-a561-a6de99fc5d38.preview.emergentagent.com",
).rstrip("/") + "/api"

ADMIN = {"email": "admin@tolongin.com", "password": "Admin@123"}
SELLER = {"email": "seller@tolongin.com", "password": "Seller@123"}
BUYER = {"email": "buyer@tolongin.com", "password": "Buyer@123"}


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def seller_token():
    return _login(SELLER)


@pytest.fixture(scope="module")
def buyer_token():
    return _login(BUYER)


# -------- 1. Backend health --------
class TestHealth:
    def test_categories_min_10(self):
        r = requests.get(f"{BASE_URL}/categories", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 10, f"expected >=10 categories, got {len(data)}"
        # ensure key fields
        assert "id" in data[0] and "name" in data[0] and "slug" in data[0]


# -------- 2. Auth for all roles --------
class TestAuthRoles:
    def test_admin_login(self, admin_token):
        assert "token" in admin_token
        assert admin_token["user"]["role"] == "ADMIN"

    def test_seller_login(self, seller_token):
        assert "token" in seller_token
        assert seller_token["user"]["email"] == SELLER["email"]

    def test_buyer_login(self, buyer_token):
        assert "token" in buyer_token
        assert buyer_token["user"]["email"] == BUYER["email"]


# -------- 3. Orders include buyer + seller --------
class TestOrdersBuyerSeller:
    def _unwrap(self, d):
        if isinstance(d, dict) and "data" in d:
            return d["data"]
        return d

    def test_buyer_orders_have_both(self, buyer_token):
        r = requests.get(f"{BASE_URL}/orders", headers=auth(buyer_token["token"]), timeout=15)
        assert r.status_code == 200
        orders = self._unwrap(r.json())
        assert isinstance(orders, list)
        if not orders:
            pytest.skip("no buyer orders to validate")
        # Check first up to 5 orders
        for o in orders[:5]:
            assert "buyer" in o and isinstance(o["buyer"], dict), f"missing buyer in order {o.get('id')}: keys={list(o.keys())}"
            assert "seller" in o and isinstance(o["seller"], dict), f"missing seller in order {o.get('id')}: keys={list(o.keys())}"
            assert o["buyer"].get("id") and o["buyer"].get("name")
            assert o["seller"].get("id") and o["seller"].get("name")

    def test_seller_orders_have_both(self, seller_token):
        r = requests.get(f"{BASE_URL}/orders", headers=auth(seller_token["token"]), timeout=15)
        assert r.status_code == 200
        orders = self._unwrap(r.json())
        assert isinstance(orders, list)
        if not orders:
            pytest.skip("no seller orders to validate")
        for o in orders[:5]:
            assert "buyer" in o and isinstance(o["buyer"], dict)
            assert "seller" in o and isinstance(o["seller"], dict)
            assert o["buyer"].get("name") and o["seller"].get("name")


# -------- 4. Services filter by sellerId --------
class TestServicesBySeller:
    def test_services_by_seller_id(self, seller_token):
        sid = seller_token["user"]["id"]
        r = requests.get(f"{BASE_URL}/services?sellerId={sid}", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, dict) and "data" in body and "meta" in body
        assert isinstance(body["data"], list)
        # if seller has any service, every one must belong to them
        for s in body["data"]:
            # seller may appear as nested object or sellerId
            sid_ret = s.get("sellerId") or (s.get("seller") or {}).get("id")
            assert sid_ret == sid, f"service {s.get('id')} sellerId mismatch: {sid_ret} != {sid}"


# -------- 5. Services full CRUD by seller --------
class TestServicesCRUD:
    def test_full_lifecycle(self, seller_token):
        token = seller_token["token"]
        # get a category id
        cats = requests.get(f"{BASE_URL}/categories", timeout=15).json()
        assert cats and len(cats) >= 1
        category_id = cats[0]["id"]

        # CREATE
        unique = uuid.uuid4().hex[:8]
        payload = {
            "title": f"TEST Service {unique}",
            "description": "TEST service description created by pytest review_request suite for automated CRUD verification.",
            "categoryId": category_id,
            "price": 50000,
            "deliveryTime": 3,
        }
        r_create = requests.post(
            f"{BASE_URL}/services",
            headers={**auth(token), "Content-Type": "application/json"},
            json=payload,
            timeout=20,
        )
        assert r_create.status_code in (200, 201), f"create failed: {r_create.status_code} {r_create.text}"
        created = r_create.json()
        created = created.get("data", created)
        assert "id" in created
        sid = created["id"]
        assert created["title"] == payload["title"]

        # GET verify persisted
        r_get = requests.get(f"{BASE_URL}/services/{sid}", timeout=15)
        assert r_get.status_code == 200, r_get.text
        got = r_get.json()
        got = got.get("data", got)
        assert got["title"] == payload["title"]

        # UPDATE
        upd_payload = {"title": f"TEST Service {unique} UPDATED", "price": 75000}
        r_upd = requests.put(
            f"{BASE_URL}/services/{sid}",
            headers={**auth(token), "Content-Type": "application/json"},
            json=upd_payload,
            timeout=20,
        )
        assert r_upd.status_code in (200, 201), f"update failed: {r_upd.status_code} {r_upd.text}"
        upd_body = r_upd.json()
        upd_body = upd_body.get("data", upd_body)
        assert upd_body["title"] == upd_payload["title"]
        assert int(upd_body["price"]) == 75000

        # TOGGLE
        r_tog = requests.post(
            f"{BASE_URL}/services/{sid}/toggle-active",
            headers=auth(token),
            timeout=15,
        )
        assert r_tog.status_code in (200, 201), f"toggle failed: {r_tog.status_code} {r_tog.text}"

        # DELETE
        r_del = requests.delete(f"{BASE_URL}/services/{sid}", headers=auth(token), timeout=15)
        assert r_del.status_code in (200, 204), f"delete failed: {r_del.status_code} {r_del.text}"

        # GET should now 404 or be flagged inactive/deleted
        r_after = requests.get(f"{BASE_URL}/services/{sid}", timeout=15)
        assert r_after.status_code in (404, 410, 200), r_after.status_code
        if r_after.status_code == 200:
            body = r_after.json()
            body = body.get("data", body)
            # tolerate soft-delete: must be inactive or flagged deleted
            assert (body.get("isActive") is False) or body.get("deletedAt") or body.get("status") in (
                "DELETED",
                "INACTIVE",
            ), f"deleted service still visible & active: {body}"
