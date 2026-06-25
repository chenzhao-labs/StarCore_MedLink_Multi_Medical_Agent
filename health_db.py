"""
Personal Health Record — SQLite storage for health profiles and daily logs.
"""
import sqlite3
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "health.db")


def _connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_db():
    c = _connect()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS health_profiles (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL DEFAULT '',
            age         INTEGER,
            gender      TEXT DEFAULT '',
            height      REAL,
            weight      REAL,
            conditions  TEXT DEFAULT '[]',
            medications TEXT DEFAULT '[]',
            allergies   TEXT DEFAULT '[]',
            surgeries   TEXT DEFAULT '[]',
            notes       TEXT DEFAULT '',
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS health_logs (
            id          TEXT PRIMARY KEY,
            log_type    TEXT NOT NULL,
            value_json  TEXT NOT NULL DEFAULT '{}',
            note        TEXT DEFAULT '',
            recorded_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_logs_type ON health_logs(log_type);
        CREATE INDEX IF NOT EXISTS idx_logs_time ON health_logs(recorded_at);
    """)
    c.commit()
    c.close()


# ─── Profile CRUD ──────────────────────────────────────────────

def get_profile(profile_id: str) -> Optional[dict]:
    c = _connect()
    row = c.execute("SELECT * FROM health_profiles WHERE id = ?", (profile_id,)).fetchone()
    c.close()
    if not row:
        return None
    d = dict(row)
    for f in ("conditions", "medications", "allergies", "surgeries"):
        d[f] = json.loads(d[f])
    return d


def get_or_create_profile(profile_id: str) -> dict:
    p = get_profile(profile_id)
    if p:
        return p
    now = _now()
    c = _connect()
    c.execute(
        "INSERT INTO health_profiles (id, name, created_at, updated_at) VALUES (?, '', ?, ?)",
        (profile_id, now, now),
    )
    c.commit()
    c.close()
    return get_profile(profile_id)


def update_profile(profile_id: str, data: dict) -> dict:
    now = _now()
    json_fields = ("conditions", "medications", "allergies", "surgeries")
    c = _connect()
    profile = get_or_create_profile(profile_id)
    updated = {**profile, **data}
    for f in json_fields:
        if f in updated and not isinstance(updated[f], str):
            updated[f] = json.dumps(updated[f], ensure_ascii=False)
    c.execute(
        """UPDATE health_profiles SET
            name=?, age=?, gender=?, height=?, weight=?,
            conditions=?, medications=?, allergies=?, surgeries=?,
            notes=?, updated_at=?
           WHERE id=?""",
        (
            updated.get("name", ""),
            updated.get("age"),
            updated.get("gender", ""),
            updated.get("height"),
            updated.get("weight"),
            updated.get("conditions", "[]"),
            updated.get("medications", "[]"),
            updated.get("allergies", "[]"),
            updated.get("surgeries", "[]"),
            updated.get("notes", ""),
            now,
            profile_id,
        ),
    )
    c.commit()
    c.close()
    return get_profile(profile_id)


# ─── Health Logs ───────────────────────────────────────────────

def add_log(log_type: str, value: dict, note: str = "") -> dict:
    log_id = str(uuid.uuid4())
    now = _now()
    c = _connect()
    c.execute(
        "INSERT INTO health_logs (id, log_type, value_json, note, recorded_at) VALUES (?, ?, ?, ?, ?)",
        (log_id, log_type, json.dumps(value, ensure_ascii=False), note, now),
    )
    c.commit()
    c.close()
    return {"id": log_id, "log_type": log_type, "value": value, "note": note, "recorded_at": now}


def get_logs(log_type: Optional[str] = None, limit: int = 30) -> list[dict]:
    c = _connect()
    if log_type:
        rows = c.execute(
            "SELECT * FROM health_logs WHERE log_type = ? ORDER BY recorded_at DESC LIMIT ?",
            (log_type, limit),
        ).fetchall()
    else:
        rows = c.execute(
            "SELECT * FROM health_logs ORDER BY recorded_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    c.close()
    return [_log_row(dict(r)) for r in rows]


def get_today_logs() -> list[dict]:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    c = _connect()
    rows = c.execute(
        "SELECT * FROM health_logs WHERE recorded_at >= ? AND recorded_at < ? ORDER BY recorded_at DESC",
        (f"{today}T00:00:00", f"{today}T23:59:59"),
    ).fetchall()
    c.close()
    return [_log_row(dict(r)) for r in rows]


def _log_row(d: dict) -> dict:
    d["value"] = json.loads(d["value_json"])
    del d["value_json"]
    return d


# ─── Summary ───────────────────────────────────────────────────

def get_summary(profile_id: str) -> dict:
    profile = get_profile(profile_id) or {}
    today_logs = get_today_logs()
    recent = get_logs(limit=7)

    # medication adherence today
    med_logs_today = [l for l in today_logs if l["log_type"] == "medication"]
    meds_taken = len(med_logs_today)
    meds_total = len(profile.get("medications", []))
    med_adherence = min(meds_taken, meds_total)

    # latest metrics
    latest_bp = _latest_of_type(recent, "blood_pressure")
    latest_glucose = _latest_of_type(recent, "blood_glucose")
    latest_weight = _latest_of_type(recent, "weight")

    return {
        "profile": profile,
        "today_logs_count": len(today_logs),
        "medication_adherence": f"{med_adherence}/{meds_total}" if meds_total else "N/A",
        "latest_blood_pressure": latest_bp,
        "latest_glucose": latest_glucose,
        "latest_weight": latest_weight,
    }


def _latest_of_type(logs: list[dict], log_type: str) -> Optional[dict]:
    for l in logs:
        if l["log_type"] == log_type:
            return l["value"]
    return None


# ─── Export context for Agent ──────────────────────────────────

def build_health_context(profile_id: str) -> str:
    """Build a compact text summary to inject into the Agent system prompt."""
    profile = get_profile(profile_id)
    if not profile:
        return ""

    parts = []
    if profile.get("age"):
        parts.append(f"Age: {profile['age']}")
    if profile.get("gender"):
        parts.append(f"Gender: {profile['gender']}")
    if profile.get("height"):
        parts.append(f"Height: {profile['height']}cm")
    if profile.get("weight"):
        parts.append(f"Weight: {profile['weight']}kg")

    conditions = profile.get("conditions", [])
    if conditions:
        parts.append(f"Chronic conditions: {', '.join(conditions)}")

    medications = profile.get("medications", [])
    if medications:
        med_str = "; ".join(
            f"{m['name']} {m.get('dose','')} {m.get('frequency','')}" if isinstance(m, dict) else str(m)
            for m in medications
        )
        parts.append(f"Current medications: {med_str}")

    allergies = profile.get("allergies", [])
    if allergies:
        parts.append(f"Allergies: {', '.join(allergies)}")

    surgeries = profile.get("surgeries", [])
    if surgeries:
        parts.append(f"Past surgeries: {', '.join(surgeries)}")

    if profile.get("notes"):
        parts.append(f"Notes: {profile['notes']}")

    if not parts:
        return ""

    return "Patient health context:\n" + "\n".join(f"  - {p}" for p in parts)


def get_fact_chunks(profile_id: str) -> list[str]:
    """Split health profile + recent logs into individual, embeddable fact strings.

    Each fact stands alone semantically so that embedding-based retrieval can
    match "最近容易累" to "患者有贫血史" without pulling in unrelated data.
    """
    profile = get_profile(profile_id)
    if not profile:
        return []

    facts = []

    # ── Demographics ──
    if profile.get("age"):
        facts.append(f"患者年龄 {profile['age']} 岁")
    if profile.get("gender"):
        facts.append(f"患者性别为 {profile['gender']}")
    if profile.get("height") and profile.get("weight"):
        bmi = round(profile["weight"] / ((profile["height"] / 100) ** 2), 1)
        facts.append(f"患者身高 {profile['height']}cm，体重 {profile['weight']}kg，BMI 为 {bmi}")

    # ── Chronic conditions ──
    for c in profile.get("conditions", []):
        facts.append(f"患者患有 {c}")

    # ── Medications ──
    for m in profile.get("medications", []):
        if isinstance(m, dict):
            text = f"患者正在服用 {m.get('name', '')}"
            if m.get("dose"):
                text += f"，剂量 {m['dose']}"
            if m.get("frequency"):
                text += f"，{m['frequency']}"
            facts.append(text)
        else:
            facts.append(f"患者正在服用 {m}")

    # ── Allergies ──
    for a in profile.get("allergies", []):
        facts.append(f"患者对 {a} 过敏")

    # ── Past surgeries ──
    for s in profile.get("surgeries", []):
        facts.append(f"患者曾接受 {s}")

    # ── Notes ──
    if profile.get("notes"):
        facts.append(f"患者备注：{profile['notes']}")

    # ── Recent health logs (last 30 entries) ──
    recent = get_logs(limit=30)
    for log in recent:
        val = log["value"]
        ts = log["recorded_at"][:10]
        lt = log["log_type"]
        if lt == "blood_pressure":
            facts.append(f"[{ts}] 血压：收缩压 {val.get('systolic','?')}mmHg，舒张压 {val.get('diastolic','?')}mmHg")
        elif lt == "blood_glucose":
            facts.append(f"[{ts}] 血糖：{val.get('value','?')} mmol/L")
        elif lt == "weight":
            facts.append(f"[{ts}] 体重：{val.get('value','?')} kg")
        elif lt == "medication":
            facts.append(f"[{ts}] 用药记录：{val.get('name','?')}，依从性 {val.get('adherence','?')}")
        elif lt == "symptom":
            facts.append(f"[{ts}] 症状记录：{val.get('description','?')}")
        else:
            facts.append(f"[{ts}] {lt}：{val}")

    return facts


# Auto-init on import
init_db()
