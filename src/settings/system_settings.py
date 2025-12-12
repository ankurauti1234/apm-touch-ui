# src/settings/system_settings.py

import subprocess
import os
from flask import Blueprint, jsonify, request

system_settings_bp = Blueprint('system_settings', __name__, url_prefix='/api')

@system_settings_bp.route("/brightness", methods=["POST"])
def set_brightness():
    try:
        data = request.get_json()
        brightness = int(data.get("brightness", 51))
        path = "/sys/class/backlight/1-0045"

        with open(f"{path}/max_brightness") as f:
            max_brightness = int(f.read().strip())

        brightness = max(51, min(brightness, max_brightness))
        os.system(f"echo {brightness} | sudo tee {path}/brightness > /dev/null")

        print(f"[BRIGHTNESS] Set to {brightness}")
        return jsonify({"success": True, "brightness": brightness}), 200
    except Exception as e:
        print(f"[BRIGHTNESS] Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@system_settings_bp.route("/current_brightness", methods=["GET"])
def get_current_brightness():
    try:
        path = "/sys/class/backlight/1-0045"
        with open(f"{path}/brightness") as f:
            brightness = int(f.read().strip())
        return jsonify({"success": True, "brightness": brightness}), 200
    except Exception as e:
        print(f"[BRIGHTNESS-GET] Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@system_settings_bp.route("/shutdown", methods=["POST"])
def shutdown():
    try:
        subprocess.run(["sudo", "systemctl", "poweroff"], check=True)
        return jsonify({"success": True, "message": "Shutting down..."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@system_settings_bp.route("/restart", methods=["POST"])
def restart():
    try:
        subprocess.run(["sudo", "systemctl", "reboot"], check=True)
        return jsonify({"success": True, "message": "Restarting..."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500