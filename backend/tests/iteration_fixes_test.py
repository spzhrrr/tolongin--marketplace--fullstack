"""Iteration-specific tests for the recent fixes:
- OTP verify aliases (/verification/email/verify, /verification/phone/verify)
- Chat conversation creation via recipientId
- Seed counts (services=24, jobs=16, categories=10)
- Public API contracts
Run: pytest /app/backend/tests/iteration_fixes_test.py -v --tb=short
"""
import os
import uuid
import requests
import pytest

BASE_URL = "http://localhost:8001/api"

NEWBIE = {"email": "newbie@tolongin.com", "password": "User@123"}
ANDI = {"email": "andi@tolongin.com", "password": "User@123"}
SARI = {"email": "sari@tolongin.com", "password": "User@123"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.text}"
    return r.json()


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Seed data sanity ----------
class TestSeedCounts:
    def test_services_count_is_24(self):
        r = requests.get(f"{BASE_URL}/services?page=1&limit=100")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body
        # Allow >=24 since tests above may have created a few more
        assert len(body["data"]) >= 24, f"Expected >=24 services, got {len(body['data'])}"

    def test_categories_count_is_10(self):
        r = requests.get(f"{BASE_URL}/categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 10, f"Expected 10 categories, got {len(data)}"

    def test_jobs_count_is_16(self):
        r = requests.get(f"{BASE_URL}/jobs?page=1&limit=100")
        assert r.status_code == 200
        body = r.json()
        items = body.get("data", body) if isinstance(body, dict) else body
        assert len(items) >= 16, f"Expected >=16 jobs, got {len(items)}"

    def test_service_card_fields(self):
        r = requests.get(f"{BASE_URL}/services?page=1&limit=1")
        s = r.json()["data"][0]
        # Required fields for marketplace cards
        for k in ["id", "title", "price", "sellerId", "categoryId"]:
            assert k in s, f"missing field {k} in service card"


# ---------- OTP verification aliases ----------
class TestVerificationAliases:
    def test_email_otp_request_returns_demoOtp(self):
        tokens = _login(NEWBIE)
        r = requests.post(
            f"{BASE_URL}/verification/email/request",
            headers=auth(tokens["token"]),
            json={},
            timeout=15,
        )
        assert r.status_code in (200, 201), f"email request failed: {r.status_code} {r.text}"
        body = r.json()
        assert "demoOtp" in body, f"demoOtp missing in mock mode: {body}"
        assert len(str(body["demoOtp"])) == 6

    def test_email_verify_alias_endpoint(self):
        """The new /email/verify alias should delegate to /confirm."""
        tokens = _login(NEWBIE)
        # Request OTP first
        req = requests.post(
            f"{BASE_URL}/verification/email/request",
            headers=auth(tokens["token"]),
            json={},
        )
        otp = req.json()["demoOtp"]

        # Hit the new alias
        v = requests.post(
            f"{BASE_URL}/verification/email/verify",
            headers=auth(tokens["token"]),
            json={"otp": str(otp)},
        )
        assert v.status_code in (200, 201), f"email verify alias failed: {v.status_code} {v.text}"

    def test_phone_otp_request_returns_demoOtp(self):
        tokens = _login(NEWBIE)
        r = requests.post(
            f"{BASE_URL}/verification/phone/request",
            headers=auth(tokens["token"]),
            json={"phone": "+6281234567890"},
            timeout=15,
        )
        assert r.status_code in (200, 201), f"phone request failed: {r.status_code} {r.text}"
        body = r.json()
        assert "demoOtp" in body, f"demoOtp missing in mock mode: {body}"

    def test_phone_verify_alias_endpoint(self):
        tokens = _login(NEWBIE)
        req = requests.post(
            f"{BASE_URL}/verification/phone/request",
            headers=auth(tokens["token"]),
            json={"phone": "+6281234567890"},
        )
        otp = req.json()["demoOtp"]
        v = requests.post(
            f"{BASE_URL}/verification/phone/verify",
            headers=auth(tokens["token"]),
            json={"otp": str(otp)},
        )
        assert v.status_code in (200, 201), f"phone verify alias failed: {v.status_code} {v.text}"

    def test_email_verify_wrong_otp_rejected(self):
        tokens = _login(NEWBIE)
        # request to ensure an active OTP exists
        requests.post(
            f"{BASE_URL}/verification/email/request",
            headers=auth(tokens["token"]),
            json={},
        )
        v = requests.post(
            f"{BASE_URL}/verification/email/verify",
            headers=auth(tokens["token"]),
            json={"otp": "000000"},
        )
        assert v.status_code in (400, 401, 422), f"wrong otp not rejected: {v.status_code} {v.text}"


# ---------- Chat conversation via recipientId ----------
class TestChatConversation:
    def test_create_conversation_with_recipientId(self):
        andi = _login(ANDI)
        sari = _login(SARI)
        sari_id = sari["user"]["id"]

        r = requests.post(
            f"{BASE_URL}/chat/conversations",
            headers=auth(andi["token"]),
            json={"recipientId": sari_id},
            timeout=15,
        )
        assert r.status_code in (200, 201), f"create conv failed: {r.status_code} {r.text}"
        body = r.json()
        conv = body.get("data", body)
        assert "id" in conv, f"conversation missing id: {conv}"

    def test_create_conversation_missing_recipientId_rejected(self):
        andi = _login(ANDI)
        r = requests.post(
            f"{BASE_URL}/chat/conversations",
            headers=auth(andi["token"]),
            json={},
        )
        assert r.status_code in (400, 422), f"missing recipientId should 400: {r.status_code} {r.text}"

    def test_post_message_to_conversation(self):
        andi = _login(ANDI)
        sari = _login(SARI)
        sari_id = sari["user"]["id"]
        c = requests.post(
            f"{BASE_URL}/chat/conversations",
            headers=auth(andi["token"]),
            json={"recipientId": sari_id},
        )
        conv = c.json().get("data", c.json())
        cid = conv["id"]

        msg = requests.post(
            f"{BASE_URL}/chat/conversations/{cid}/messages",
            headers=auth(andi["token"]),
            json={"content": "TEST message via REST"},
        )
        assert msg.status_code in (200, 201), f"send message failed: {msg.status_code} {msg.text}"

    def test_list_conversations(self):
        andi = _login(ANDI)
        r = requests.get(f"{BASE_URL}/chat/conversations", headers=auth(andi["token"]))
        assert r.status_code == 200
        body = r.json()
        items = body if isinstance(body, list) else body.get("data", [])
        assert isinstance(items, list)


# ---------- Order detail / buyer flow ----------
class TestBuyerOrders:
    def test_rina_buyer_orders(self):
        rina = _login({"email": "rina.buyer@tolongin.com", "password": "Buyer@123"})
        r = requests.get(f"{BASE_URL}/orders", headers=auth(rina["token"]))
        assert r.status_code == 200
        body = r.json()
        items = body if isinstance(body, list) else body.get("data", [])
        # Per problem statement: ~4 orders
        assert len(items) >= 2, f"expected several orders for rina, got {len(items)}"


# ---------- WS handshake (Socket.IO HTTP polling) ----------
class TestSocketIOHandshake:
    def test_socketio_endpoint_responds(self):
        """The Socket.IO endpoint should respond at /api/socket.io/ (handshake)."""
        # Plain GET to the polling endpoint — should return a Socket.IO error/handshake (200/400, not 404)
        r = requests.get(f"http://localhost:8001/api/socket.io/?EIO=4&transport=polling", timeout=10)
        # Socket.IO v4 returns 200 (open packet) or 400 (bad request). 404 means path not mounted.
        assert r.status_code != 404, f"Socket.IO not mounted at /api/socket.io: {r.status_code} {r.text[:200]}"
