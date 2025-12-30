import os
import time
import sqlite3
import threading
from config import DB_PATH, METER_ID  # Adjust import based on your project structure
from config import load_hhid
from users.members import load_members_data
from mqtt import _enqueue, _pub_q, _q_lock, calculate_age  # Assuming you have a mqtt module

LAST_BOOT_ID_FILE = "/var/lib/meter_last_boot_id.txt"

def get_current_boot_id():
    """Read current boot_id from kernel"""
    try:
        with open('/proc/sys/kernel/random/boot_id', 'r') as f:
            return f.read().strip()
    except Exception as e:
        print(f"[BOOT_ID] Error reading current boot_id: {e}")
        return None

def is_fresh_boot():
    """Check if this is a fresh system boot"""
    current = get_current_boot_id()
    if not current:
        return False

    if not os.path.exists(LAST_BOOT_ID_FILE):
        print("[BOOT_ID] No previous boot_id found — treating as fresh boot")
        return True

    try:
        with open(LAST_BOOT_ID_FILE, 'r') as f:
            last = f.read().strip()
        if current != last:
            print(f"[BOOT_ID] Boot ID changed: {last} → {current} — fresh boot detected")
            return True
        else:
            print("[BOOT_ID] Same boot_id — not a fresh boot (process restart?)")
            return False
    except Exception as e:
        print(f"[BOOT_ID] Error reading last boot_id: {e}")
        return True  # Safe default: assume fresh

def save_current_boot_id():
    """Save current boot_id for next run"""
    current = get_current_boot_id()
    if not current:
        return
    try:
        os.makedirs(os.path.dirname(LAST_BOOT_ID_FILE), exist_ok=True)
        with open(LAST_BOOT_ID_FILE, "w") as f:
            f.write(current)
        print(f"[BOOT_ID] Saved current boot_id: {current}")
    except Exception as e:
        print(f"[BOOT_ID] Failed to save boot_id: {e}")

def deactivate_all_members_and_publish():
    """Reset all members to inactive and queue fresh Type 3"""
    try:
        hhid = load_hhid()
        if not hhid:
            print("[BOOT] No HHID configured yet — skipping member reset")
            return

        with sqlite3.connect(DB_PATH) as conn:
            cur = conn.cursor()
            cur.execute("UPDATE members SET active = 0 WHERE meter_id = ? AND hhid = ?", (METER_ID, hhid))
            count = cur.rowcount
            conn.commit()
        print(f"[BOOT] Deactivated {count} members in database")

        data = load_members_data()
        members = [
            {
                "member_id": m.get("member_code", ""),
                "age": calculate_age(m["dob"]),
                "gender": m["gender"],
                "active": False  # All inactive on boot
            }
            for m in data.get("members", [])
            if "dob" in m and "gender" in m and calculate_age(m["dob"]) is not None
        ]

        payload = {
            "DEVICE_ID": METER_ID,
            "TS": str(int(time.time())),
            "Type": 3,
            "Details": {"members": members}
        }
        _enqueue(payload)
        print("[BOOT] Fresh 'all inactive' Type 3 event QUEUED")
    except Exception as e:
        print(f"[BOOT] Error in deactivate_all_members_and_publish: {e}")

def clear_guests_and_publish():
    """Remove all guests and queue fresh Type 4 (empty)"""
    try:
        hhid = load_hhid()
        if not hhid:
            print("[BOOT] No HHID yet — skipping guest clear")
            return

        with sqlite3.connect(DB_PATH) as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM guests WHERE meter_id = ? AND hhid = ?", (METER_ID, hhid))
            deleted_count = cur.rowcount
            conn.commit()
        print(f"[BOOT] Removed {deleted_count} guests from database")

        payload = {
            "DEVICE_ID": METER_ID,
            "TS": str(int(time.time())),
            "Type": 4,
            "Details": {"guests": []}
        }
        _enqueue(payload)
        print("[BOOT] Fresh 'no guests' Type 4 event QUEUED")
    except Exception as e:
        print(f"[BOOT] Error in clear_guests_and_publish: {e}")

def perform_fresh_boot_reset():
    """Main function to call on startup — handles full reset if fresh boot"""
    if is_fresh_boot():
        print("[BOOT] Fresh boot detected — resetting viewing session")

        # Reset DB state
        deactivate_all_members_and_publish()
        clear_guests_and_publish()

        # Clear any stale queued events
        with _q_lock:
            old_size = len(_pub_q)
            _pub_q.clear()
            print(f"[BOOT] Fully cleared queue ({old_size} old/stale events removed)")

        # Re-queue fresh clean state
        deactivate_all_members_and_publish()
        clear_guests_and_publish()
        print("[BOOT] Re-queued fresh Type 3 and Type 4 events — clean state")
    else:
        print("[BOOT] Same boot — preserving existing queue (offline events safe)")

    # Always save current boot_id for next comparison
    save_current_boot_id()