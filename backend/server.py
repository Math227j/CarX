from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timedelta, timezone, date
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get("JWT_SECRET", "flashcarx-secret-change-me-2026")
JWT_ALGO = "HS256"
JWT_EXP_DAYS = 30

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()


# ============ MODELS ============
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    username: str
    email: str
    avatar: Optional[str] = None
    level: int = 1
    xp: int = 0
    default_percentage: float = 40.0
    total_earnings: float = 0.0
    total_washes: int = 0
    created_at: datetime


class WashCreate(BaseModel):
    car_name: str
    value: float
    percentage: Optional[float] = None
    date: Optional[str] = None  # YYYY-MM-DD


class WashUpdate(BaseModel):
    car_name: Optional[str] = None
    value: Optional[float] = None
    percentage: Optional[float] = None


class Wash(BaseModel):
    id: str
    user_id: str
    car_name: str
    value: float
    percentage: float
    user_earning: float
    date: str  # YYYY-MM-DD
    created_at: datetime


class GoalUpdate(BaseModel):
    daily_goal: Optional[float] = None
    weekly_goal: Optional[float] = None


class SettingsUpdate(BaseModel):
    default_percentage: Optional[float] = None
    daily_goal: Optional[float] = None
    weekly_goal: Optional[float] = None
    avatar: Optional[str] = None


class FriendRequestAction(BaseModel):
    request_id: str


# ============ HELPERS ============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


def public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "username": u["username"],
        "email": u.get("email", ""),
        "avatar": u.get("avatar"),
        "level": u.get("level", 1),
        "xp": u.get("xp", 0),
        "default_percentage": u.get("default_percentage", 40.0),
        "total_earnings": u.get("total_earnings", 0.0),
        "total_washes": u.get("total_washes", 0),
        "created_at": u.get("created_at", datetime.now(timezone.utc)),
        "daily_goal": u.get("daily_goal", 200.0),
        "weekly_goal": u.get("weekly_goal", 1000.0),
    }


def today_str() -> str:
    return date.today().isoformat()


def week_start_str() -> str:
    d = date.today()
    monday = d - timedelta(days=d.weekday())
    return monday.isoformat()


def month_start_str() -> str:
    d = date.today()
    return d.replace(day=1).isoformat()


def calc_level(xp: int) -> int:
    # simple curve: level n needs n*100 xp cumulative
    lvl = 1
    remaining = xp
    step = 100
    while remaining >= step:
        remaining -= step
        lvl += 1
        step += 50
    return lvl


# ============ AUTH ROUTES ============
@api_router.post("/auth/register")
async def register(payload: UserRegister):
    username = payload.username.strip().lower()
    email = payload.email.strip().lower()
    if await db.users.find_one({"username": username}):
        raise HTTPException(400, "Username já está em uso")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email já cadastrado")
    user = {
        "id": str(uuid.uuid4()),
        "username": username,
        "email": email,
        "password_hash": hash_password(payload.password),
        "avatar": None,
        "level": 1,
        "xp": 0,
        "default_percentage": 40.0,
        "daily_goal": 200.0,
        "weekly_goal": 1000.0,
        "total_earnings": 0.0,
        "total_washes": 0,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user)
    token = create_token(user["id"])
    return {"token": token, "user": public_user(user)}


@api_router.post("/auth/login")
async def login(payload: UserLogin):
    email = payload.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Email ou senha incorretos")
    token = create_token(user["id"])
    return {"token": token, "user": public_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api_router.patch("/auth/me")
async def update_me(payload: SettingsUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.dict(exclude_none=True).items()}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return public_user(updated)


# ============ WASHES ============
@api_router.post("/washes")
async def create_wash(payload: WashCreate, user: dict = Depends(get_current_user)):
    pct = payload.percentage if payload.percentage is not None else user.get("default_percentage", 40.0)
    earning = round(payload.value * pct / 100.0, 2)
    wash = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "car_name": payload.car_name.strip(),
        "value": float(payload.value),
        "percentage": float(pct),
        "user_earning": earning,
        "date": payload.date or today_str(),
        "created_at": datetime.now(timezone.utc),
    }
    await db.washes.insert_one(wash.copy())
    # award XP: 10 XP per wash + 1 XP per R$ earned
    xp_gain = 10 + int(earning)
    new_xp = user.get("xp", 0) + xp_gain
    new_level = calc_level(new_xp)
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"total_earnings": earning, "total_washes": 1},
         "$set": {"xp": new_xp, "level": new_level}},
    )
    wash.pop("_id", None)
    return {"wash": wash, "xp_gained": xp_gain, "new_level": new_level}


@api_router.get("/washes")
async def list_washes(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 500,
    user: dict = Depends(get_current_user),
):
    q = {"user_id": user["id"]}
    if date_from or date_to:
        q["date"] = {}
        if date_from:
            q["date"]["$gte"] = date_from
        if date_to:
            q["date"]["$lte"] = date_to
    cursor = db.washes.find(q, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cursor.to_list(limit)


@api_router.patch("/washes/{wash_id}")
async def update_wash(wash_id: str, payload: WashUpdate, user: dict = Depends(get_current_user)):
    w = await db.washes.find_one({"id": wash_id, "user_id": user["id"]}, {"_id": 0})
    if not w:
        raise HTTPException(404, "Lavagem não encontrada")
    updates = {k: v for k, v in payload.dict(exclude_none=True).items()}
    new_value = updates.get("value", w["value"])
    new_pct = updates.get("percentage", w["percentage"])
    new_earning = round(float(new_value) * float(new_pct) / 100.0, 2)
    updates["user_earning"] = new_earning
    updates["value"] = float(new_value)
    updates["percentage"] = float(new_pct)
    diff_earning = new_earning - w["user_earning"]
    await db.washes.update_one({"id": wash_id}, {"$set": updates})
    if diff_earning != 0:
        await db.users.update_one({"id": user["id"]}, {"$inc": {"total_earnings": diff_earning}})
    updated = await db.washes.find_one({"id": wash_id}, {"_id": 0})
    return updated


@api_router.delete("/washes/{wash_id}")
async def delete_wash(wash_id: str, user: dict = Depends(get_current_user)):
    w = await db.washes.find_one({"id": wash_id, "user_id": user["id"]}, {"_id": 0})
    if not w:
        raise HTTPException(404, "Lavagem não encontrada")
    await db.washes.delete_one({"id": wash_id})
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"total_earnings": -w["user_earning"], "total_washes": -1}},
    )
    return {"ok": True}


# ============ STATS ============
async def _aggregate_range(user_id: str, date_from: str, date_to: Optional[str] = None):
    q = {"user_id": user_id, "date": {"$gte": date_from}}
    if date_to:
        q["date"]["$lte"] = date_to
    washes = await db.washes.find(q, {"_id": 0}).to_list(10000)
    revenue = sum(w["value"] for w in washes)
    earnings = sum(w["user_earning"] for w in washes)
    return {"washes": len(washes), "revenue": round(revenue, 2), "earnings": round(earnings, 2)}


@api_router.get("/stats/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    today = await _aggregate_range(user["id"], today_str())
    week = await _aggregate_range(user["id"], week_start_str())
    month = await _aggregate_range(user["id"], month_start_str())
    todays_washes = await db.washes.find(
        {"user_id": user["id"], "date": today_str()}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return {
        "today": today,
        "week": week,
        "month": month,
        "todays_washes": todays_washes,
        "daily_goal": user.get("daily_goal", 200.0),
        "weekly_goal": user.get("weekly_goal", 1000.0),
    }


@api_router.get("/stats/analytics")
async def analytics(user: dict = Depends(get_current_user)):
    month_from = month_start_str()
    washes = await db.washes.find(
        {"user_id": user["id"], "date": {"$gte": month_from}}, {"_id": 0}
    ).to_list(10000)
    by_day = {}
    by_car = {}
    for w in washes:
        by_day.setdefault(w["date"], {"earnings": 0, "washes": 0})
        by_day[w["date"]]["earnings"] += w["user_earning"]
        by_day[w["date"]]["washes"] += 1
        by_car.setdefault(w["car_name"], {"count": 0, "revenue": 0.0, "earnings": 0.0})
        by_car[w["car_name"]]["count"] += 1
        by_car[w["car_name"]]["revenue"] += w["value"]
        by_car[w["car_name"]]["earnings"] += w["user_earning"]
    daily_series = [{"date": d, **v} for d, v in sorted(by_day.items())]
    cars_ranked = sorted(
        [{"name": k, **v} for k, v in by_car.items()],
        key=lambda x: x["earnings"], reverse=True,
    )
    top_car = cars_ranked[0] if cars_ranked else None
    most_washed = sorted(
        [{"name": k, **v} for k, v in by_car.items()],
        key=lambda x: x["count"], reverse=True,
    )
    most_washed_car = most_washed[0] if most_washed else None
    return {
        "daily_series": daily_series,
        "cars": cars_ranked,
        "top_car": top_car,
        "most_washed_car": most_washed_car,
    }


# ============ FRIENDS ============
@api_router.get("/users/search")
async def search_users(q: str, user: dict = Depends(get_current_user)):
    q = q.strip().lower()
    if len(q) < 2:
        return []
    cursor = db.users.find(
        {
            "$or": [
                {"username": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}},
            ],
            "id": {"$ne": user["id"]},
        },
        {"_id": 0, "password_hash": 0},
    ).limit(20)
    users = await cursor.to_list(20)
    # attach friendship status
    result = []
    for u in users:
        friend = await db.friendships.find_one({
            "$or": [
                {"user_a": user["id"], "user_b": u["id"]},
                {"user_a": u["id"], "user_b": user["id"]},
            ]
        }, {"_id": 0})
        req = await db.friend_requests.find_one({
            "$or": [
                {"from_user": user["id"], "to_user": u["id"], "status": "pending"},
                {"from_user": u["id"], "to_user": user["id"], "status": "pending"},
            ]
        }, {"_id": 0})
        status_str = "none"
        if friend:
            status_str = "friends"
        elif req:
            status_str = "sent" if req["from_user"] == user["id"] else "received"
        result.append({**public_user(u), "friendship_status": status_str})
    return result


@api_router.post("/friends/request/{target_user_id}")
async def send_friend_request(target_user_id: str, user: dict = Depends(get_current_user)):
    if target_user_id == user["id"]:
        raise HTTPException(400, "Você não pode enviar solicitação para si mesmo")
    target = await db.users.find_one({"id": target_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Usuário não encontrado")
    existing_friend = await db.friendships.find_one({
        "$or": [
            {"user_a": user["id"], "user_b": target_user_id},
            {"user_a": target_user_id, "user_b": user["id"]},
        ]
    })
    if existing_friend:
        raise HTTPException(400, "Vocês já são amigos")
    existing_req = await db.friend_requests.find_one({
        "$or": [
            {"from_user": user["id"], "to_user": target_user_id, "status": "pending"},
            {"from_user": target_user_id, "to_user": user["id"], "status": "pending"},
        ]
    })
    if existing_req:
        raise HTTPException(400, "Solicitação já existe")
    req = {
        "id": str(uuid.uuid4()),
        "from_user": user["id"],
        "to_user": target_user_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    }
    await db.friend_requests.insert_one(req.copy())
    req.pop("_id", None)
    return {"ok": True}


@api_router.get("/friends/requests")
async def list_friend_requests(user: dict = Depends(get_current_user)):
    incoming = await db.friend_requests.find(
        {"to_user": user["id"], "status": "pending"}, {"_id": 0}
    ).to_list(100)
    outgoing = await db.friend_requests.find(
        {"from_user": user["id"], "status": "pending"}, {"_id": 0}
    ).to_list(100)
    async def hydrate(reqs, field):
        out = []
        for r in reqs:
            u = await db.users.find_one({"id": r[field]}, {"_id": 0, "password_hash": 0})
            if u:
                out.append({**r, "user": public_user(u)})
        return out
    return {
        "incoming": await hydrate(incoming, "from_user"),
        "outgoing": await hydrate(outgoing, "to_user"),
    }


@api_router.post("/friends/accept/{request_id}")
async def accept_friend(request_id: str, user: dict = Depends(get_current_user)):
    req = await db.friend_requests.find_one({"id": request_id, "to_user": user["id"], "status": "pending"}, {"_id": 0})
    if not req:
        raise HTTPException(404, "Solicitação não encontrada")
    await db.friend_requests.update_one({"id": request_id}, {"$set": {"status": "accepted"}})
    friendship = {
        "id": str(uuid.uuid4()),
        "user_a": req["from_user"],
        "user_b": req["to_user"],
        "created_at": datetime.now(timezone.utc),
    }
    await db.friendships.insert_one(friendship.copy())
    return {"ok": True}


@api_router.post("/friends/reject/{request_id}")
async def reject_friend(request_id: str, user: dict = Depends(get_current_user)):
    r = await db.friend_requests.update_one(
        {"id": request_id, "to_user": user["id"], "status": "pending"},
        {"$set": {"status": "rejected"}},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Solicitação não encontrada")
    return {"ok": True}


@api_router.delete("/friends/{friend_user_id}")
async def remove_friend(friend_user_id: str, user: dict = Depends(get_current_user)):
    r = await db.friendships.delete_one({
        "$or": [
            {"user_a": user["id"], "user_b": friend_user_id},
            {"user_a": friend_user_id, "user_b": user["id"]},
        ]
    })
    if r.deleted_count == 0:
        raise HTTPException(404, "Amizade não encontrada")
    return {"ok": True}


async def _friend_ids(user_id: str) -> List[str]:
    cursor = db.friendships.find({"$or": [{"user_a": user_id}, {"user_b": user_id}]}, {"_id": 0})
    friendships = await cursor.to_list(1000)
    ids = []
    for f in friendships:
        ids.append(f["user_b"] if f["user_a"] == user_id else f["user_a"])
    return ids


@api_router.get("/friends")
async def list_friends(user: dict = Depends(get_current_user)):
    ids = await _friend_ids(user["id"])
    users = await db.users.find({"id": {"$in": ids}}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [public_user(u) for u in users]


# ============ RANKING ============
@api_router.get("/ranking")
async def ranking(
    period: Literal["daily", "weekly", "monthly"] = "daily",
    metric: Literal["earnings", "revenue", "washes"] = "earnings",
    user: dict = Depends(get_current_user),
):
    if period == "daily":
        date_from = today_str()
    elif period == "weekly":
        date_from = week_start_str()
    else:
        date_from = month_start_str()

    friend_ids = await _friend_ids(user["id"])
    all_ids = friend_ids + [user["id"]]

    pipeline = [
        {"$match": {"user_id": {"$in": all_ids}, "date": {"$gte": date_from}}},
        {"$group": {
            "_id": "$user_id",
            "earnings": {"$sum": "$user_earning"},
            "revenue": {"$sum": "$value"},
            "washes": {"$sum": 1},
        }},
    ]
    agg = await db.washes.aggregate(pipeline).to_list(1000)
    scores = {row["_id"]: row for row in agg}

    users = await db.users.find({"id": {"$in": all_ids}}, {"_id": 0, "password_hash": 0}).to_list(1000)
    entries = []
    for u in users:
        s = scores.get(u["id"], {"earnings": 0, "revenue": 0, "washes": 0})
        entries.append({
            "user": public_user(u),
            "earnings": round(s["earnings"], 2),
            "revenue": round(s["revenue"], 2),
            "washes": s["washes"],
        })
    entries.sort(key=lambda x: x[metric], reverse=True)
    for i, e in enumerate(entries):
        e["rank"] = i + 1
        e["is_me"] = e["user"]["id"] == user["id"]
    return {"period": period, "metric": metric, "entries": entries}


# ============ ACHIEVEMENTS ============
ACHIEVEMENTS = [
    {"id": "first_wash", "name": "Primeira Lavagem", "desc": "Registre sua primeira lavagem", "icon": "star", "threshold": 1, "type": "washes"},
    {"id": "wash_10", "name": "10 Lavagens", "desc": "Complete 10 lavagens", "icon": "trophy", "threshold": 10, "type": "washes"},
    {"id": "wash_50", "name": "50 Lavagens", "desc": "Complete 50 lavagens", "icon": "medal", "threshold": 50, "type": "washes"},
    {"id": "wash_100", "name": "100 Lavagens", "desc": "Complete 100 lavagens", "icon": "crown", "threshold": 100, "type": "washes"},
    {"id": "earn_100", "name": "R$ 100 Ganhos", "desc": "Ganhe R$ 100 no total", "icon": "cash", "threshold": 100, "type": "earnings"},
    {"id": "earn_1k", "name": "R$ 1.000 Ganhos", "desc": "Ganhe R$ 1.000 no total", "icon": "briefcase", "threshold": 1000, "type": "earnings"},
    {"id": "earn_5k", "name": "R$ 5.000 Ganhos", "desc": "Ganhe R$ 5.000 no total", "icon": "gem", "threshold": 5000, "type": "earnings"},
    {"id": "friend_1", "name": "Amizade!", "desc": "Adicione seu primeiro amigo", "icon": "users", "threshold": 1, "type": "friends"},
]


@api_router.get("/achievements")
async def list_achievements(user: dict = Depends(get_current_user)):
    friends_count = len(await _friend_ids(user["id"]))
    stats = {
        "washes": user.get("total_washes", 0),
        "earnings": user.get("total_earnings", 0),
        "friends": friends_count,
    }
    out = []
    for a in ACHIEVEMENTS:
        cur = stats[a["type"]]
        out.append({
            **a,
            "current": cur,
            "unlocked": cur >= a["threshold"],
            "progress": min(1.0, cur / a["threshold"]),
        })
    return out


# ============ FRIENDS ACTIVITY FEED ============
@api_router.get("/feed")
async def activity_feed(user: dict = Depends(get_current_user)):
    friend_ids = await _friend_ids(user["id"])
    if not friend_ids:
        return []
    washes = await db.washes.find(
        {"user_id": {"$in": friend_ids}}, {"_id": 0}
    ).sort("created_at", -1).limit(30).to_list(30)
    users_map = {}
    for uid in set(w["user_id"] for w in washes):
        u = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
        if u:
            users_map[uid] = public_user(u)
    return [{"wash": w, "user": users_map.get(w["user_id"])} for w in washes if users_map.get(w["user_id"])]


@api_router.get("/")
async def root():
    return {"message": "Flash CarX API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await db.users.create_index("username", unique=True)
    await db.users.create_index("email", unique=True)
    await db.washes.create_index([("user_id", 1), ("date", -1)])
    await db.friendships.create_index([("user_a", 1), ("user_b", 1)])


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
