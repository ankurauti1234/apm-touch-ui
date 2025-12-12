# src/installation/assignment.py

import requests
from flask import Blueprint, jsonify, request
import os

from src.config import METER_ID, DEVICE_CONFIG
from src.installation.system_files import set_current_state, set_installation_done
from src.users.members import save_members_data

API_BASE     = "https://bt72jq8w9i.execute-api.ap-south-1.amazonaws.com/test"
INITIATE_URL = f"{API_BASE}/initiate-assignment"
VERIFY_URL   = f"{API_BASE}/verify-otp"
MEMBERS_URL  = f"{API_BASE}/members"

# CHANGED: Blueprint name is now 'assignment' (not 'lambda')
assignment_bp = Blueprint('assignment', __name__, url_prefix='/api')


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


@assignment_bp.route("/submit_hhid", methods=["POST"])
def submit_hhid():
    set_current_state("hhid_input")
    hhid = request.json.get("hhid")
    if not hhid:
        return jsonify({"success": False, "error": "HHID required"}), 400

    save_hhid(hhid)
    try:
        payload = {"meter_id": METER_ID, "hhid": hhid}
        resp = requests.post(INITIATE_URL, json=payload, timeout=30)
        data = resp.json()
        set_current_state("otp_verification")
        return jsonify({"success": data.get("success", False)}), 200
    except requests.exceptions.Timeout:
        return jsonify({"success": False, "error": "Timeout"}), 504
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@assignment_bp.route("/submit_otp", methods=["POST"])
def submit_otp():
    data = request.json
    meter_id = data.get("meter_id") or METER_ID
    hhid = data.get("hhid")
    otp = data.get("otp")
    if not all([meter_id, hhid, otp]):
        return jsonify({"success": False, "error": "meter_id, hhid, otp required"}), 400

    try:
        payload = {"meter_id": meter_id, "hhid": hhid, "otp": otp}
        resp = requests.post(VERIFY_URL, json=payload, timeout=30)
        result = resp.json()
        if result.get("success"):
            save_hhid(hhid)
            set_current_state("input_source_detection")
        return jsonify({"success": result.get("success", False)}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@assignment_bp.route("/finalize", methods=["POST"])
def finalize():
    set_current_state("finalize")
    hhid = load_hhid()
    if not hhid:
        return jsonify({"success": False, "error": "HHID not found"}), 400

    try:
        url = f"{MEMBERS_URL}?meterid={METER_ID}&hhid={hhid}"
        resp = requests.get(url, timeout=30)
        server_data = resp.json()

        if server_data.get("success"):
            members = [
                {
                    "member_code": m["member_code"],
                    "dob": m["dob"],
                    "gender": m["gender"],
                    "created_at": m.get("created_at"),
                    "active": False
                }
                for m in server_data.get("members", [])
                if all(k in m for k in ["member_code", "dob", "gender"])
            ]
            save_data = {
                "meter_id": METER_ID,
                "hhid": hhid,
                "members": members
            }
            save_members_data(save_data)
            set_installation_done()
            return jsonify({"success": True, "data": server_data}), 200
        else:
            set_installation_done()
            return jsonify({"success": False, "error": server_data.get("message", "Failed")}), 400
    except requests.exceptions.Timeout:
        set_installation_done()
        return jsonify({"success": False, "error": "Timeout"}), 504
    except Exception as e:
        set_installation_done()
        return jsonify({"success": False, "error": str(e)}), 500