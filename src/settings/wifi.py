# src/settings/wifi.py

import subprocess
import time
from pathlib import Path
import configparser
from io import StringIO
from flask import Blueprint, jsonify, request

# NEW: Import from shared config + system state
from src.config import SYSTEM_FILES
from src.installation.system_files import set_current_state
from src.utils.system import run_system_command

wifi_bp = Blueprint('wifi', __name__, url_prefix='/api')


@wifi_bp.route("/check_wifi", methods=["GET"])
def check_wifi():
    set_current_state("connect_select")
    try:
        ok, out = run_system_command(
            ["nmcli", "-t", "-f", "TYPE,DEVICE", "connection", "show", "--active"]
        )
        if not ok:
            return jsonify({"success": False}), 200

        for line in out.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split(":", 1)
            if len(parts) < 2:
                continue
            conn_type, device = parts[0], parts[1]

            if conn_type == "802-11-wireless" and (device.startswith("wlan") or device.startswith("wlx")):
                return jsonify({"success": True}), 200

        return jsonify({"success": False}), 200
    except Exception:
        return jsonify({"success": False}), 200


@wifi_bp.route("/current_wifi", methods=["GET"])
def current_wifi():
    try:
        ok, out = run_system_command(
            ["nmcli", "-t", "-f", "NAME,TYPE,DEVICE", "connection", "show", "--active"]
        )
        if not ok:
            return jsonify({"success": False, "error": "nmcli failed"}), 500

        for line in out.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split(":", 2)
            if len(parts) < 3:
                continue

            name, conn_type, device = parts[0], parts[1], parts[2]

            if conn_type == "802-11-wireless" and (device.startswith("wlan") or device.startswith("wlx")):
                return jsonify({"success": True, "ssid": name}), 200

        return jsonify({"success": False, "error": "No active Wi-Fi connection"}), 404

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@wifi_bp.route("/wifi/connect", methods=["POST"])
def wifi_connect():
    data = request.json
    ssid = data.get("ssid")
    pwd = data.get("password")
    wifi_up_file = SYSTEM_FILES["wifi_up"]

    if not ssid or not pwd:
        return jsonify({"success": False, "error": "SSID and password required"}), 400

    try:
        # Delete existing
        try:
            run_system_command(["sudo", "nmcli", "connection", "delete", ssid])
        except subprocess.CalledProcessError as e:
            if "not found" not in e.stderr.lower():
                print(f"[WiFi] Warning: Failed to delete old connection: {e.stderr}")

        # Connect
        ok, out = run_system_command([
            "sudo", "nmcli", "device", "wifi", "connect", ssid, "password", pwd
        ])

        if not ok:
            error_msg = out.strip() or "Unknown error"
            print(f"[WiFi] Connection failed: {error_msg}")
            return jsonify({"success": False, "error": "Failed to connect", "details": error_msg}), 500

        print(f"[WiFi] Connected to {ssid}")

        # Create flag
        try:
            subprocess.run(["echo", "1", "|", "sudo", "tee", wifi_up_file], shell=True, check=True)
        except Exception as e:
            print(f"[WiFi] Failed to create wifi_up file: {e}")

        return jsonify({"success": True, "message": "Connected", "ssid": ssid}), 200

    except Exception as e:
        return jsonify({"success": False, "error": "Internal error", "details": str(e)}), 500


@wifi_bp.route("/wifi/disconnect", methods=["POST"])
def wifi_disconnect():
    try:
        run_system_command(["sudo", "nmcli", "device", "disconnect", "wlan0"])
        return jsonify({"success": True, "message": "Disconnected"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@wifi_bp.route("/wifi/networks", methods=["GET"])
def list_wifi_networks():
    try:
        print("[WiFi] Rescanning networks...")
        run_system_command(["sudo", "nmcli", "device", "wifi", "rescan"])
        time.sleep(2.5)

        ok, out = run_system_command([
            "nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY", "device", "wifi", "list"
        ])
        if not ok:
            return jsonify({"success": False, "error": "Scan failed"}), 500

        available = []
        seen_ssids = set()
        for line in out.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split(":", 2)
            if len(parts) < 3 or not parts[0].strip():
                continue

            ssid = parts[0].strip()
            if ssid in seen_ssids:
                continue
            seen_ssids.add(ssid)

            signal = parts[1].strip()
            security = parts[2].strip() or "Open"

            available.append({
                "ssid": ssid,
                "signal_strength": f"{signal}%",
                "security": security,
                "saved": False,
                "password": None
            })

        # Saved networks
        nm_dir = Path("/etc/NetworkManager/system-connections")
        saved = []
        if nm_dir.exists():
            ok, file_list = run_system_command(["sudo", "ls", str(nm_dir)])
            if ok:
                for filename in file_list.strip().split("\n"):
                    if not filename.strip():
                        continue
                    file_path = nm_dir / filename
                    ok, content = run_system_command(["sudo", "cat", str(file_path)])
                    if not ok:
                        continue

                    parser = configparser.RawConfigParser()
                    parser.read_string(content)

                    def safe_get(section, key):
                        try:
                            return parser.get(section, key)
                        except:
                            return None

                    ssid_val = (
                        safe_get("wifi", "ssid") or
                        safe_get("802-11-wireless", "ssid") or
                        safe_get("connection", "id")
                    )
                    if not ssid_val:
                        continue
                    ssid_val = ssid_val.strip().strip('"').strip("'")

                    key_mgmt = (safe_get("wifi-security", "key-mgmt") or "none").lower()
                    password = safe_get("wifi-security", "psk") if key_mgmt in ["wpa-psk", "wpa-eap"] else None

                    saved.append({
                        "ssid": ssid_val,
                        "signal_strength": None,
                        "security": key_mgmt.title().replace("Psk", "PSK").replace("Eap", "EAP"),
                        "saved": True,
                        "password": password
                    })

        # Merge & sort
        merged = {n["ssid"]: n.copy() for n in available}
        for s in saved:
            if s["ssid"] in merged:
                merged[s["ssid"]]["saved"] = True
                if s["password"]:
                    merged[s["ssid"]]["password"] = s["password"]
            else:
                merged[s["ssid"]] = s

        result = sorted(
            merged.values(),
            key=lambda x: (not x["saved"], -(int(x["signal_strength"].rstrip("%") or "0")))
        )

        return jsonify({"success": True, "networks": result}), 200

    except Exception as e:
        import traceback
        print(f"[WiFi ERROR] {e}\n{traceback.format_exc()}")
        return jsonify({"success": False, "error": str(e)}), 500