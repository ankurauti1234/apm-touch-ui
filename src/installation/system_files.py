# src/installation/system_files.py

import os
from flask import Blueprint, jsonify

# These come from app.py (we'll keep them there for now — safe & working)
from src.config import (
    METER_ID,
    SYSTEM_FILES,
    DEVICE_CONFIG
)

system_files_bp = Blueprint('system_files', __name__, url_prefix='/api')


# ——— Pure system state functions ———
def current_state() -> str:
    if not os.path.exists(SYSTEM_FILES["current_state"]):
        with open(SYSTEM_FILES["current_state"], "w") as f:
            f.write("welcome")
    return open(SYSTEM_FILES["current_state"]).read().strip()


def set_current_state(state: str):
    with open(SYSTEM_FILES["current_state"], "w") as f:
        f.write(state)


def is_installation_done() -> bool:
    if not os.path.exists(SYSTEM_FILES["install_done"]):
        with open(SYSTEM_FILES["install_done"], "w") as f:
            f.write("0")
    return open(SYSTEM_FILES["install_done"]).read().strip() == "1"


def set_installation_done():
    with open(SYSTEM_FILES["install_done"], "w") as f:
        f.write("1")
# ——— End of pure system functions ———


@system_files_bp.route("/check_installation", methods=["GET"])
def check_installation():
    return jsonify({"installed": is_installation_done(), "meter_id": METER_ID})


@system_files_bp.route("/check_current_state", methods=["GET"])
def check_current_state():
    return jsonify({"current_state": current_state()})


@system_files_bp.route("/input_sources", methods=["GET"])
def get_input_sources():
    sources = []
    if os.path.exists(SYSTEM_FILES["jack_status"]):
        sources.append("line_in")
    if os.path.exists(SYSTEM_FILES["hdmi_input"]):
        sources.append("HDMI")

    if not sources:
        return jsonify({
            "success": False,
            "error": "No input sources detected",
            "sources": []
        }), 404

    return jsonify({"success": True, "sources": sources}), 200


@system_files_bp.route("/video_detection", methods=["GET"])
def check_video_detection():
    set_current_state("video_object_detection")
    if os.path.exists(SYSTEM_FILES["video_detection"]):
        try:
            content = open(SYSTEM_FILES["video_detection"]).read().strip()
            return jsonify({
                "success": True,
                "detected": True,
                "status": content or "active"
            }), 200
        except Exception as e:
            return jsonify({"success": False, "error": f"Failed to read video_detection: {str(e)}"}), 500
    else:
        return jsonify({
            "success": True,
            "detected": False,
            "status": "not_running"
        }), 200


@system_files_bp.route("/check_gsm", methods=["GET"])
def check_gsm():
    if os.path.exists(SYSTEM_FILES["gsm_up"]):
        set_current_state("connect_select")
        return jsonify({"success": True})
    return jsonify({"success": False})