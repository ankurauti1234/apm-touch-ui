# src/users/members.py

import sqlite3
import json
import time
import threading
from flask import Blueprint, jsonify, request

from src.config import METER_ID, DB_PATH, load_hhid
from src.mqtt import client, _enqueue, wait_for_publish_success, publish_member_event, _mqtt_log, calculate_age

members_bp = Blueprint('members', __name__, url_prefix='/api')


def save_members_data(data: dict):
    meter_id = data.get("meter_id", METER_ID)
    hhid = data.get("hhid", load_hhid())
    members = data.get("members", [])
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM members WHERE meter_id = ? AND hhid = ?", (meter_id, hhid))
        for m in members:
            cur.execute("""
                INSERT INTO members (
                    meter_id, hhid, member_code, name, dob, gender, created_at, active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                meter_id, hhid,
                m.get("member_code"),
                m.get("name", m.get("member_code")),  # fallback to member_code if name missing
                m.get("dob"),
                m.get("gender"),
                m.get("created_at"),
                int(m.get("active", False))
            ))
        conn.commit()


def load_members_data() -> dict:
    hhid = load_hhid()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT member_code, name, dob, gender, created_at, active
            FROM members WHERE meter_id = ? AND hhid = ?
        """, (METER_ID, hhid))
        members = []
        for row in cur.fetchall():
            members.append({
                "member_code": row[0],
                "name": row[1] or row[0],  # fallback to member_code if name is NULL
                "dob": row[2],
                "gender": row[3],
                "created_at": row[4],
                "active": bool(row[5])
            })
    return {"meter_id": METER_ID, "hhid": hhid, "members": members}


# ----------------------------------------------------------------------
# Endpoints — keep your existing ones (they use load/save so they work automatically)
# ----------------------------------------------------------------------
@members_bp.route("/members", methods=["GET"])
def get_members():
    try:
        data = load_members_data()
        return jsonify({"success": True, "data": data}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@members_bp.route("/toggle_member_status", methods=["POST"])
def toggle_member_status():
    index = request.json.get("index")
    if not isinstance(index, int):
        return jsonify({"success": False, "error": "Invalid index"}), 400

    try:
        data = load_members_data()
        members = data.get("members", [])
        if not (0 <= index < len(members)):
            return jsonify({"success": False, "error": "Index out of range"}), 400

        member = members[index]
        new_active_state = not member.get("active", False)

        members_payload = []
        for i, m in enumerate(members):
            age = calculate_age(m.get("dob"))
            if age is None:
                continue
            members_payload.append({
                "member_id": m.get("member_code", ""),
                "age": age,
                "gender": m["gender"],
                "active": new_active_state if i == index else m.get("active", False)
            })

        payload = {
            "DEVICE_ID": METER_ID,
            "TS": str(int(time.time())),
            "Type": 3,
            "Details": {"members": members_payload}
        }
        payload_json = json.dumps(payload)

        publish_ok = False
        if client and client.is_connected():
            publish_ok = wait_for_publish_success(client, payload_json, timeout=8.0)

        if not publish_ok:
            _enqueue(payload)
            publish_ok = True

        if not publish_ok:
            return jsonify({"success": False, "error": "Failed to send update"}), 503

        member["active"] = new_active_state
        save_members_data(data)

        return jsonify({
            "success": True,
            "member": member,
            "mqtt_sent": True
        }), 200

    except Exception as e:
        _mqtt_log(f"Error in toggle_member_status: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@members_bp.route("/edit_member_name", methods=["POST"])
def edit_member_name():
    """
    Request:
      { "index": 0, "name": "Rahul" }
    """
    idx = request.json.get("index")
    new_name = request.json.get("name")
    if not isinstance(idx, int) or not new_name:
        return jsonify({"success": False, "error": "index and name required"}), 400

    try:
        data = load_members_data()
        members = data.get("members", [])
        if 0 <= idx < len(members):
            old_name = members[idx].get("name", members[idx]["member_code"])
            members[idx]["name"] = new_name.strip()

            save_members_data(data)

            # Optional: publish updated state (recommended)
            publish_member_event()

            print(f"[MEMBER] Renamed member {idx}: '{old_name}' → '{new_name}'")

            return jsonify({
                "success": True,
                "member": members[idx],
                "message": "Display name updated"
            }), 200
        else:
            return jsonify({"success": False, "error": "Index out of range"}), 400
    except Exception as e:
        print(f"[ERROR] edit_member_name: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

# ────────────────────────────────────────────────────────────────
#          Hourly member status publisher (background task)
# ────────────────────────────────────────────────────────────────

def publish_members_periodically():
    """Every ~1 hour: publish current member list via MQTT"""
    while True:
        try:
            # For production: 3600 seconds = 1 hour
            # For testing:     30   seconds = every 30 seconds
            #                 120  seconds = every 2 minutes
            time.sleep(30)               # ← change this value during testing

            data = load_members_data()
            members_payload = []

            for m in data.get("members", []):
                # Optional: only include active members
                # if not m.get("active", False):
                #     continue

                age = calculate_age(m.get("dob"))
                if age is None:
                    continue

                members_payload.append({
                    "member_id": m.get("member_code", ""),
                    "age": age,
                    "gender": m["gender"],
                    "active": bool(m.get("active", False))
                })

            if not members_payload:
                _mqtt_log("[HOURLY] No valid members to publish → skipping")
                continue

            payload = {
                "DEVICE_ID": METER_ID,
                "TS": str(int(time.time())),
                "Type": 3,
                "Details": {"members": members_payload}
            }

            _mqtt_log(f"[HOURLY] Publishing {len(members_payload)} members")

            # ─── Choose one publishing method ─────────────────────────────
            # Option A: Use your existing helper (recommended if it works)
            publish_member_event()

            # Option B: Direct publish (more control, same format as toggle)
            # payload_json = json.dumps(payload)
            # if client and client.is_connected():
            #     wait_for_publish_success(client, payload_json, timeout=8.0)
            # else:
            #     _enqueue(payload)

        except Exception as e:
            _mqtt_log(f"[HOURLY] Publish failed: {e}")
            time.sleep(60)  # wait 1 min before retry


# Start the background thread only once (important!)
if threading.current_thread() is threading.main_thread():
    _mqtt_log("[START] Starting hourly member publisher thread")
    threading.Thread(
        target=publish_members_periodically,
        daemon=True,
        name="HourlyMemberPublisher"
    ).start()