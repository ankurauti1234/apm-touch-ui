# src/users/guests.py

import sqlite3
import json
import time
from flask import Blueprint, jsonify, request

from src.config import METER_ID, DB_PATH, load_hhid
from src.mqtt import client, _enqueue, wait_for_publish_success, _mqtt_log

guests_bp = Blueprint('guests', __name__, url_prefix='/api')


def load_guests_data():
    hhid = load_hhid()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT age, gender, active
            FROM guests WHERE meter_id = ? AND hhid = ?
        """, (METER_ID, hhid))
        guests = []
        for row in cur.fetchall():
            guests.append({
                "age": row[0],
                "gender": row[1],
                "active": bool(row[2])
            })
        return guests


def save_guests_data(guest_list):
    hhid = load_hhid()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM guests WHERE meter_id = ? AND hhid = ?", (METER_ID, hhid))
        for g in guest_list:
            cur.execute("""
                INSERT INTO guests (meter_id, hhid, age, gender, active)
                VALUES (?, ?, ?, ?, ?)
            """, (METER_ID, hhid, g.get("age"), g.get("gender"), int(g.get("active", True))))
        conn.commit()


def load_guests_count():
    hhid = load_hhid()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM guests WHERE meter_id = ? AND hhid = ?", (METER_ID, hhid))
        return cur.fetchone()[0]


def get_guests_for_ui():
    return load_guests_data()


# ----------------------------------------------------------------------
# Guest endpoints — keep your existing ones (they use the new functions)
# ----------------------------------------------------------------------
@guests_bp.route("/guest_count", methods=["GET"])
def api_guest_count():
    count = load_guests_count()
    print(f"[INFO] Guest count: {count}")
    return jsonify({"success": True, "count": count}), 200


@guests_bp.route("/guests_list", methods=["GET"])
def api_guests_list():
    guests = get_guests_for_ui()
    return jsonify({"success": True, "guests": guests}), 200


@guests_bp.route("/update_guests", methods=["POST"])
def update_guests():
    try:
        payload = request.get_json()
        if not payload or "Details" not in payload:
            return jsonify({"success": False, "error": "Invalid payload"}), 400

        guest_list = payload["Details"].get("guests", [])
        save_guests_data(guest_list)

        payload_json = json.dumps(payload)
        publish_ok = False
        if client and client.is_connected():
            publish_ok = wait_for_publish_success(client, payload_json, timeout=8.0)
        if not publish_ok:
            _enqueue(payload)

        return jsonify({
            "success": True,
            "guest_count": len(guest_list),
            "mqtt_status": "sent" if publish_ok else "queued"
        }), 200
    except Exception as e:
        print(f"[ERROR] update_guests: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@guests_bp.route("/sync_guests", methods=["POST"])
def sync_guests():
    try:
        data = request.get_json()
        if not data or "guests" not in data:
            return jsonify({"success": False, "error": "Invalid data"}), 400

        guest_list = data["guests"]
        payload = {
            "DEVICE_ID": METER_ID,
            "TS": str(int(time.time())),
            "Type": 4,
            "Details": {
                "guests": [{"age": g["age"], "gender": g["gender"], "active": True} for g in guest_list]
            }
        }
        payload_json = json.dumps(payload)
        _mqtt_log(f"SYNC GUESTS → {len(guest_list)} guests")

        publish_ok = False
        if client and client.is_connected():
            publish_ok = wait_for_publish_success(client, payload_json, timeout=8.0)
        if not publish_ok:
            _enqueue(payload)

        save_guests_data(guest_list)

        return jsonify({"success": True, "guest_count": len(guest_list)}), 200
    except Exception as e:
        _mqtt_log(f"ERROR sync_guests: {e}")
        return jsonify({"success": False, "error": "Server error"}), 500


@guests_bp.route("/get_guests", methods=["GET"])
def get_guests():
    guests = load_guests_data()
    return jsonify({"success": True, "guests": guests, "count": len(guests)}), 200