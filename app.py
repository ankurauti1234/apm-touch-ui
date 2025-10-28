#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import time
import subprocess
import threading
import requests
from typing import List, Tuple

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

from PyQt5 import QtWidgets, QtCore
from PyQt5.QtCore import QUrl, Qt
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEngineSettings
from PyQt5.QtGui import QKeySequence
from PyQt5.QtWidgets import QShortcut

# ----------------------------------------------------------------------
# 1. Qt / Chromium sandbox settings (required on many embedded images)
# ----------------------------------------------------------------------
os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = "--no-sandbox"
os.environ["XDG_RUNTIME_DIR"] = "/tmp/runtime-root"
os.makedirs("/tmp/runtime-root", exist_ok=True)
os.chmod("/tmp/runtime-root", 0o700)

# ----------------------------------------------------------------------
# 2. Flask application
# ----------------------------------------------------------------------
app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)                     # allow the WebEngine page to call the API

# ----------------------------------------------------------------------
# 3. Device configuration (same as your new code)
# ----------------------------------------------------------------------
DEVICE_CONFIG = {
    "device_id_file": "/var/lib/device_id.txt",
    "hhid_file": "/var/lib/hhid.txt",
    "default_meter_id": "AM100003",
    "members_file": "/var/lib/meter_members.json",
}

SYSTEM_FILES = {
    "install_done": "/var/lib/self_installation_done",
    "wifi_up": "/run/wifi_network_up",
    "gsm_up": "/run/gsm_network_up",
    "jack_status": "/run/jack_status",
    "hdmi_input": "/run/input_source_hdmi",
    "video_detection": "/run/video_object_detection",
}

# ----------------------------------------------------------------------
# 4. Load meter-id (fallback to default)
# ----------------------------------------------------------------------
try:
    with open(DEVICE_CONFIG["device_id_file"], "r") as f:
        METER_ID = f.read().strip()
except FileNotFoundError:
    METER_ID = DEVICE_CONFIG["default_meter_id"]
print(f"[INFO] METER_ID = {METER_ID}")

# ----------------------------------------------------------------------
# 5. Helper utilities
# ----------------------------------------------------------------------
def run_system_command(command: List[str]) -> Tuple[bool, str]:
    try:
        res = subprocess.run(command, check=True, capture_output=True, text=True)
        return True, res.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr


def is_installation_done() -> bool:
    if not os.path.exists(SYSTEM_FILES["install_done"]):
        with open(SYSTEM_FILES["install_done"], "w") as f:
            f.write("0")
    return open(SYSTEM_FILES["install_done"]).read().strip() == "1"


def set_installation_done():
    with open(SYSTEM_FILES["install_done"], "w") as f:
        f.write("1")


def save_hhid(hhid: str):
    with open(DEVICE_CONFIG["hhid_file"], "w") as f:
        f.write(hhid)


def load_hhid() -> str:
    try:
        with open(DEVICE_CONFIG["hhid_file"], "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        return ""


def save_members_data(data: dict):
    with open(DEVICE_CONFIG["members_file"], "w") as f:
        json.dump(data, f, indent=2)


# ----------------------------------------------------------------------
# 6. Flask routes (identical to your new version – only tiny clean-ups)
# ----------------------------------------------------------------------
API_BASE = "https://bt72jq8w9i.execute-api.ap-south-1.amazonaws.com/test"
INITIATE_URL = f"{API_BASE}/initiate-assignment"
VERIFY_URL   = f"{API_BASE}/verify-otp"
MEMBERS_URL  = f"{API_BASE}/members"


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/check_installation", methods=["GET"])
def check_installation():
    return jsonify({"installed": is_installation_done(), "meter_id": METER_ID})


@app.route("/api/check_wifi", methods=["GET"])
def check_wifi():
    return jsonify({"success": os.path.exists(SYSTEM_FILES["wifi_up"])})


@app.route("/api/current_wifi", methods=["GET"])
def current_wifi():
    try:
        ok, out = run_system_command(
            ["nmcli", "-t", "-f", "NAME,TYPE,DEVICE", "connection", "show", "--active"]
        )
        if not ok:
            return jsonify({"success": False, "error": "nmcli failed"}), 500

        for line in out.strip().split("\n"):
            if ":wifi:" in line and "wlan" in line:
                ssid = line.split(":")[0]
                return jsonify({"success": True, "ssid": ssid})
        return jsonify({"success": False, "error": "No Wi-Fi"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/wifi/connect", methods=["POST"])
def wifi_connect():
    data = request.json
    ssid = data.get("ssid")
    pwd  = data.get("password")
    if not ssid or not pwd:
        return jsonify({"success": False, "error": "SSID & password required"}), 400

    try:
        run_system_command(["sudo", "nmcli", "connection", "delete", ssid])
        ok, out = run_system_command(
            ["sudo", "nmcli", "device", "wifi", "connect", ssid, "password", pwd]
        )
        if ok:
            open(SYSTEM_FILES["wifi_up"], "a").close()
            return jsonify({"success": True, "message": "Connected"}), 200
        return jsonify({"success": False, "error": out}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/wifi/disconnect", methods=["POST"])
def wifi_disconnect():
    try:
        run_system_command(["sudo", "nmcli", "device", "disconnect", "wlan0"])
        if os.path.exists(SYSTEM_FILES["wifi_up"]):
            os.remove(SYSTEM_FILES["wifi_up"])
        return jsonify({"success": True, "message": "Disconnected"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/wifi/networks", methods=["GET"])
def list_wifi_networks():
    try:
        run_system_command(["sudo", "nmcli", "device", "wifi", "rescan"])
        time.sleep(2)
        ok, out = run_system_command(
            ["nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY", "device", "wifi", "list"]
        )
        if not ok:
            return jsonify({"success": False, "error": "scan failed"}), 500

        nets = []
        for line in out.strip().split("\n"):
            if not line:
                continue
            parts = line.split(":")
            if len(parts) >= 3 and parts[0]:
                nets.append(
                    {
                        "ssid": parts[0],
                        "signal_strength": f"{parts[1]}%",
                        "security": parts[2] if parts[2] else "Open",
                    }
                )
        return jsonify({"success": True, "networks": nets}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/shutdown", methods=["POST"])
def shutdown():
    try:
        subprocess.run(["sudo", "shutdown", "-h", "now"], check=True)
        return jsonify({"success": True, "message": "Shutting down..."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/restart", methods=["POST"])
def restart():
    try:
        subprocess.run(["sudo", "reboot"], check=True)
        return jsonify({"success": True, "message": "Restarting..."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/submit_hhid", methods=["POST"])
def submit_hhid():
    hhid = request.json.get("hhid")
    if not hhid:
        return jsonify({"success": False, "error": "HHID required"}), 400

    save_hhid(hhid)
    try:
        payload = {"meter_id": METER_ID, "hhid": hhid}
        resp = requests.post(INITIATE_URL, json=payload, timeout=30)
        data = resp.json()
        return jsonify({"success": data.get("success", False)}), 200
    except requests.exceptions.Timeout:
        return jsonify({"success": False, "error": "Timeout"}), 504
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/submit_otp", methods=["POST"])
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
        return jsonify({"success": result.get("success", False)}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/members", methods=["GET"])
def get_members():
    try:
        with open(DEVICE_CONFIG["members_file"], "r") as f:
            data = json.load(f)
        data["hhid"] = load_hhid()
        return jsonify({"success": True, "data": data}), 200
    except FileNotFoundError:
        return jsonify({"success": False, "error": "No members data"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/finalize", methods=["POST"])
def finalize():
    hhid = load_hhid()
    if not hhid:
        return jsonify({"success": False, "error": "HHID not found"}), 400

    try:
        url = f"{MEMBERS_URL}?meterid={METER_ID}&hhid={hhid}"
        resp = requests.get(url, timeout=30)
        data = resp.json()
        if data.get("success"):
            save_members_data(data)
            set_installation_done()
            return jsonify({"success": True, "data": data}), 200
        else:
            set_installation_done()
            return jsonify({"success": False, "error": data.get("message", "Failed")}), 400
    except requests.exceptions.Timeout:
        set_installation_done()
        return jsonify({"success": False, "error": "Timeout"}), 504
    except Exception as e:
        set_installation_done()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/close")
def close_application():
    QtCore.QCoreApplication.quit()
    return "Closing..."


# ----------------------------------------------------------------------
# 7. Flask runner (non-blocking)
# ----------------------------------------------------------------------
def run_flask():
    # debug=False, use_reloader=False → safe for threading
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False, threaded=True)


# ----------------------------------------------------------------------
# 8. PyQt5 full-screen WebEngine window
# ----------------------------------------------------------------------
class BrowserWindow(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()
        self.browser = QWebEngineView()
        self.setCentralWidget(self.browser)
        self.showFullScreen()

        # ---- basic settings ------------------------------------------------
        self.browser.setZoomFactor(1.0)
        settings = self.browser.settings()
        settings.setAttribute(QWebEngineSettings.ShowScrollBars, False)
        settings.setAttribute(QWebEngineSettings.JavascriptEnabled, True)

        # ---- prevent pinch-zoom / ctrl-wheel --------------------------------
        self.browser.setAttribute(Qt.WA_AcceptTouchEvents, False)
        self.setAttribute(Qt.WA_AcceptTouchEvents, False)

        # ---- JavaScript that disables all zoom gestures --------------------
        ZOOM_PREVENT_JS = """
        (function(){
            // meta viewport
            var m = document.createElement('meta');
            m.name = 'viewport';
            m.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.head.appendChild(m);

            // block gestures
            var block = function(e){ e.preventDefault(); };
            document.addEventListener('gesturestart',  block, {passive:false});
            document.addEventListener('gesturechange', block, {passive:false});
            document.addEventListener('gestureend',    block, {passive:false});
            document.addEventListener('touchmove', function(e){
                if(e.touches.length>1) e.preventDefault();
            }, {passive:false});

            // block ctrl-wheel
            document.addEventListener('wheel', function(e){
                if(e.ctrlKey) e.preventDefault();
            }, {passive:false});
        })();
        """

        # inject after page load
        def _inject(ok: bool):
            if ok:
                self.browser.page().runJavaScript(ZOOM_PREVENT_JS)

        self.browser.loadFinished.connect(_inject)

        # ---- disable keyboard zoom shortcuts -------------------------------
        for seq in [
            QKeySequence.ZoomIn,
            QKeySequence.ZoomOut,
            "Ctrl+=",
            "Ctrl+-",
            "Ctrl+0",
        ]:
            QShortcut(QKeySequence(seq), self, lambda: None)

        # ---- finally load the local Flask UI --------------------------------
        self.browser.setUrl(QUrl("http://127.0.0.1:5000"))

    # Alt+F4 = exit
    def keyPressEvent(self, event):
        if event.key() == Qt.Key_F4 and event.modifiers() == Qt.AltModifier:
            self.close()
        super().keyPressEvent(event)

    # block ctrl-wheel zoom
    def wheelEvent(self, event):
        if event.modifiers() & Qt.ControlModifier:
            event.ignore()
        else:
            super().wheelEvent(event)


# ----------------------------------------------------------------------
# 9. Main entry point
# ----------------------------------------------------------------------
if __name__ == "__main__":
    # 1. start Flask in a daemon thread
    threading.Thread(target=run_flask, daemon=True).start()

    # 2. give Flask a moment to bind the port (very important!)
    time.sleep(1.5)

    # 3. launch Qt application
    qt_app = QtWidgets.QApplication(sys.argv)
    win = BrowserWindow()
    win.show()
    sys.exit(qt_app.exec_())