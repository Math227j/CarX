"""
Flash CarX Backend API Tests
Covers: auth, washes, stats, friends, ranking, achievements, feed
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://social-ranking-app.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Unique suffix to make each run's data unique but reproducible
RUN_ID = uuid.uuid4().hex[:6]

USER1 = {"username": f"tst1{RUN_ID}", "email": f"tst1{RUN_ID}@test.com", "password": "pass123"}
USER2 = {"username": f"tst2{RUN_ID}", "email": f"tst2{RUN_ID}@test.com", "password": "pass123"}


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _register(session, u):
    r = session.post(f"{API}/auth/register", json=u)
    return r


def _headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def user1_ctx(session):
    r = _register(session, USER1)
    assert r.status_code == 200, f"register user1 failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return {"token": data["token"], "user": data["user"]}


@pytest.fixture(scope="session")
def user2_ctx(session):
    r = _register(session, USER2)
    assert r.status_code == 200, f"register user2 failed: {r.status_code} {r.text}"
    return {"token": r.json()["token"], "user": r.json()["user"]}


# ============ AUTH ============
class TestAuth:
    def test_register_duplicate_email(self, session, user1_ctx):
        r = session.post(f"{API}/auth/register",
                         json={"username": f"other{RUN_ID}", "email": USER1["email"], "password": "pass123"})
        assert r.status_code == 400

    def test_register_duplicate_username(self, session, user1_ctx):
        r = session.post(f"{API}/auth/register",
                         json={"username": USER1["username"], "email": f"other{RUN_ID}@t.com", "password": "pass123"})
        assert r.status_code == 400

    def test_login_valid(self, session, user1_ctx):
        r = session.post(f"{API}/auth/login", json={"email": USER1["email"], "password": USER1["password"]})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_invalid(self, session, user1_ctx):
        r = session.post(f"{API}/auth/login", json={"email": USER1["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_token(self, session, user1_ctx):
        r = session.get(f"{API}/auth/me", headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200
        u = r.json()
        assert u["username"] == USER1["username"]
        assert "default_percentage" in u

    def test_me_without_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code in (401, 403)

    def test_update_me_settings(self, session, user1_ctx):
        r = session.patch(f"{API}/auth/me",
                          headers=_headers(user1_ctx["token"]),
                          json={"default_percentage": 45.0, "daily_goal": 250.0, "weekly_goal": 1500.0})
        assert r.status_code == 200
        u = r.json()
        assert u["default_percentage"] == 45.0
        assert u["daily_goal"] == 250.0
        assert u["weekly_goal"] == 1500.0


# ============ WASHES ============
class TestWashes:
    def test_create_wash(self, session, user1_ctx):
        r = session.post(f"{API}/washes",
                         headers=_headers(user1_ctx["token"]),
                         json={"car_name": "Civic", "value": 100.0})
        assert r.status_code == 200
        data = r.json()
        w = data["wash"]
        # user1 default_percentage was updated to 45 above
        assert w["user_earning"] == round(100.0 * 45.0 / 100.0, 2)
        assert w["percentage"] == 45.0
        assert data["xp_gained"] > 0
        user1_ctx["last_wash_id"] = w["id"]

    def test_create_wash_custom_pct(self, session, user1_ctx):
        r = session.post(f"{API}/washes",
                         headers=_headers(user1_ctx["token"]),
                         json={"car_name": "Corolla", "value": 200.0, "percentage": 50.0})
        assert r.status_code == 200
        w = r.json()["wash"]
        assert w["user_earning"] == 100.0
        user1_ctx["second_wash_id"] = w["id"]

    def test_list_washes(self, session, user1_ctx):
        r = session.get(f"{API}/washes", headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200
        washes = r.json()
        assert isinstance(washes, list)
        assert len(washes) >= 2

    def test_update_wash(self, session, user1_ctx):
        wid = user1_ctx.get("last_wash_id")
        r = session.patch(f"{API}/washes/{wid}",
                          headers=_headers(user1_ctx["token"]),
                          json={"value": 150.0})
        assert r.status_code == 200
        w = r.json()
        assert w["value"] == 150.0
        assert w["user_earning"] == round(150.0 * 45.0 / 100.0, 2)

    def test_delete_wash(self, session, user1_ctx):
        wid = user1_ctx.get("second_wash_id")
        r = session.delete(f"{API}/washes/{wid}", headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200
        # verify gone
        r2 = session.patch(f"{API}/washes/{wid}",
                           headers=_headers(user1_ctx["token"]),
                           json={"value": 1.0})
        assert r2.status_code == 404


# ============ STATS ============
class TestStats:
    def test_dashboard(self, session, user1_ctx):
        r = session.get(f"{API}/stats/dashboard", headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200
        d = r.json()
        for k in ("today", "week", "month", "todays_washes", "daily_goal", "weekly_goal"):
            assert k in d
        for period in ("today", "week", "month"):
            for f in ("washes", "revenue", "earnings"):
                assert f in d[period]

    def test_analytics(self, session, user1_ctx):
        r = session.get(f"{API}/stats/analytics", headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200
        a = r.json()
        for k in ("daily_series", "cars", "top_car", "most_washed_car"):
            assert k in a
        assert a["top_car"] is not None
        assert a["top_car"]["name"] == "Civic"


# ============ FRIENDS ============
class TestFriends:
    def test_search_min_chars(self, session, user1_ctx):
        r = session.get(f"{API}/users/search?q=a", headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200
        assert r.json() == []

    def test_search_finds_user2(self, session, user1_ctx, user2_ctx):
        r = session.get(f"{API}/users/search?q={USER2['username'][:5]}",
                        headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200
        arr = r.json()
        found = [u for u in arr if u["id"] == user2_ctx["user"]["id"]]
        assert len(found) == 1
        assert found[0]["friendship_status"] == "none"

    def test_self_friend_request_rejected(self, session, user1_ctx):
        r = session.post(f"{API}/friends/request/{user1_ctx['user']['id']}",
                         headers=_headers(user1_ctx["token"]))
        assert r.status_code == 400

    def test_send_friend_request(self, session, user1_ctx, user2_ctx):
        r = session.post(f"{API}/friends/request/{user2_ctx['user']['id']}",
                         headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200

    def test_duplicate_friend_request(self, session, user1_ctx, user2_ctx):
        r = session.post(f"{API}/friends/request/{user2_ctx['user']['id']}",
                         headers=_headers(user1_ctx["token"]))
        assert r.status_code == 400

    def test_list_requests_incoming(self, session, user2_ctx, user1_ctx):
        r = session.get(f"{API}/friends/requests", headers=_headers(user2_ctx["token"]))
        assert r.status_code == 200
        data = r.json()
        incoming = data["incoming"]
        assert any(x["from_user"] == user1_ctx["user"]["id"] for x in incoming)
        user2_ctx["req_id"] = next(x["id"] for x in incoming if x["from_user"] == user1_ctx["user"]["id"])

    def test_search_status_sent(self, session, user1_ctx, user2_ctx):
        r = session.get(f"{API}/users/search?q={USER2['username'][:5]}",
                        headers=_headers(user1_ctx["token"]))
        found = [u for u in r.json() if u["id"] == user2_ctx["user"]["id"]]
        assert found[0]["friendship_status"] == "sent"

    def test_accept_friend(self, session, user2_ctx):
        rid = user2_ctx["req_id"]
        r = session.post(f"{API}/friends/accept/{rid}", headers=_headers(user2_ctx["token"]))
        assert r.status_code == 200

    def test_list_friends(self, session, user1_ctx, user2_ctx):
        r = session.get(f"{API}/friends", headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200
        assert any(f["id"] == user2_ctx["user"]["id"] for f in r.json())

    def test_reject_flow(self, session, user1_ctx, user2_ctx):
        # user2 -> user1 (need fresh request first - they're already friends so this should fail)
        r = session.post(f"{API}/friends/request/{user1_ctx['user']['id']}",
                         headers=_headers(user2_ctx["token"]))
        assert r.status_code == 400  # already friends


# ============ RANKING ============
class TestRanking:
    def test_ranking_daily_earnings(self, session, user1_ctx, user2_ctx):
        # Add a wash for user2 too
        session.post(f"{API}/washes",
                     headers=_headers(user2_ctx["token"]),
                     json={"car_name": "Fusca", "value": 50.0})
        r = session.get(f"{API}/ranking?period=daily&metric=earnings",
                        headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200
        d = r.json()
        assert d["period"] == "daily"
        assert d["metric"] == "earnings"
        ids = [e["user"]["id"] for e in d["entries"]]
        assert user1_ctx["user"]["id"] in ids
        assert user2_ctx["user"]["id"] in ids
        # user1 is_me flag
        me_entry = next(e for e in d["entries"] if e["user"]["id"] == user1_ctx["user"]["id"])
        assert me_entry["is_me"] is True
        assert me_entry["rank"] in (1, 2)

    def test_ranking_weekly_revenue(self, session, user1_ctx):
        r = session.get(f"{API}/ranking?period=weekly&metric=revenue",
                        headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200
        assert r.json()["metric"] == "revenue"

    def test_ranking_monthly_washes(self, session, user1_ctx):
        r = session.get(f"{API}/ranking?period=monthly&metric=washes",
                        headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200


# ============ ACHIEVEMENTS / FEED ============
class TestAchievementsFeed:
    def test_achievements(self, session, user1_ctx):
        r = session.get(f"{API}/achievements", headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 5
        first_wash = next(a for a in arr if a["id"] == "first_wash")
        assert first_wash["unlocked"] is True
        friend_ach = next(a for a in arr if a["id"] == "friend_1")
        assert friend_ach["unlocked"] is True

    def test_feed(self, session, user1_ctx, user2_ctx):
        r = session.get(f"{API}/feed", headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200
        feed = r.json()
        # user2 has at least 1 wash and they are friends
        assert any(item["user"]["id"] == user2_ctx["user"]["id"] for item in feed)


# ============ CLEANUP: remove friendship (idempotent-ish) ============
class TestZCleanup:
    def test_remove_friend(self, session, user1_ctx, user2_ctx):
        r = session.delete(f"{API}/friends/{user2_ctx['user']['id']}",
                           headers=_headers(user1_ctx["token"]))
        assert r.status_code == 200
        # second delete → 404
        r2 = session.delete(f"{API}/friends/{user2_ctx['user']['id']}",
                            headers=_headers(user1_ctx["token"]))
        assert r2.status_code == 404
