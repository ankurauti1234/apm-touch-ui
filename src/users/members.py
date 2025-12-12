# src/users/members.py

import json
import time
from flask import Blueprint, jsonify, request

from src.config import METER_ID, DEVICE_CONFIG
from src.mqtt import (
    client, _enqueue, wait_for_publish_success,
    publish_member_event, _mqtt_log, calculate_age
)

members_bp = Blueprint('members', __name__, url_prefix='/api')


def load_members_data() -> dict:
    try:
        with open(DEVICE_CONFIG["members_file"], "r") as f:
            data = json.load(f)
        clean_members = []
        for m in data.get("members", []):
            clean = {
                "member_code": m.get("member_code"),
                "dob": m.get("dob"),
                "gender": m.get("gender"),
                "created_at": m.get("created_at"),
                "active": m.get("active", False)
            }
            clean = {k: v for k, v in clean.items() if v is not None}
            clean_members.append(clean)
        data["members"] = clean_members
        return data
    except FileNotFoundError:
        from src.installation.assignment import load_hhid
        return {"meter_id": METER_ID, "hhid": load_hhid(), "members": []}


def save_members_data(data: dict):
    with open(DEVICE_CONFIG["members_file"], "w") as f:
        json.dump(data, f, indent=2)


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

        # Build full payload
        members_payload = []
        for i, m in enumerate(members):
            age = calculate_age(m.get("dob"))
            if age is None:
                continue
            members_payload.append({
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


@members_bp.route("/edit_member_code", methods=["POST"])
def edit_member_code():
    idx = request.json.get("index")
    code = request.json.get("member_code")
    if not isinstance(idx, int) or not code:
        return jsonify({"success": False, "error": "index and member_code required"}), 400

    try:
        data = load_members_data()
        members = data.get("members", [])
        if 0 <= idx < len(members):
            members[idx]["member_code"] = code.strip().upper()
            save_members_data(data)
            publish_member_event()
            return jsonify({"success": True, "member": members[idx]}), 200
        else:
            return jsonify({"success": False, "error": "Index out of range"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500