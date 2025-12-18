# src/config.py — shared configuration (no imports!)

import os
import sqlite3


# Add this right after the existing imports
DB_PATH = "/var/lib/meter.db"

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meter_id TEXT NOT NULL,
                hhid TEXT NOT NULL,
                member_code TEXT,
                dob TEXT,
                gender TEXT,
                created_at TEXT,
                active INTEGER DEFAULT 0
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS guests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meter_id TEXT NOT NULL,
                hhid TEXT NOT NULL,
                age INTEGER,
                gender TEXT,
                active INTEGER DEFAULT 1
            )
        """)
        conn.commit()

DEVICE_CONFIG = {
    "device_id_file": "/var/lib/device_id.txt",
    "hhid_file": "/var/lib/hhid.txt",
    # "members_file": "/var/lib/meter_members.json",
    # "guests_file": "/var/lib/meter_guests.json",
    "certs_dir": "/opt/apm/certs"
}

SYSTEM_FILES = {
    "install_done": "/var/lib/self_installation_done",
    "wifi_up": "/run/wifi_network_up",
    "gsm_up": "/run/gsm_network_up",
    "jack_status": "/run/jack_status",
    "hdmi_input": "/run/input_source_hdmi",
    "video_detection": "/run/video_object_detection",
    "current_state": "/var/lib/current_state",
}

def get_meter_id() -> str:
    path = DEVICE_CONFIG["device_id_file"]
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                meter_id = f.read().strip()
                if meter_id:
                    return meter_id
        except Exception as e:
            print(f"[CONFIG] Failed to read {path}: {e}")

    fallback = DEVICE_CONFIG.get("default_meter_id", "IM000000")
    print(f"[CONFIG] Using fallback meter ID: {fallback}")
    return fallback

# Load at import time
try:
    with open(DEVICE_CONFIG["device_id_file"], "r") as f:
        METER_ID = f.read().strip()
except FileNotFoundError:
    METER_ID = get_meter_id()
print(f"[INFO] METER_ID = {METER_ID}")

# HHID functions — live here
def save_hhid(hhid: str):
    with open(DEVICE_CONFIG["hhid_file"], "w") as f:
        f.write(hhid)

def load_hhid() -> str:
    try:
        with open(DEVICE_CONFIG["hhid_file"], "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        return ""