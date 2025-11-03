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

import paho.mqtt.client as mqtt
import ssl

# ----------------------------------------------------------------------
# 1. Qt / Chromium sandbox settings (uncomment if needed on restricted env)
# ----------------------------------------------------------------------
# os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = "--no-sandbox"
# os.environ["XDG_RUNTIME_DIR"] = "/tmp/runtime-root"
# os.makedirs("/tmp/runtime-root", exist_ok=True)
# os.chmod("/tmp/runtime-root", 700)

# ----------------------------------------------------------------------
# 2. Flask application
# ----------------------------------------------------------------------
app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

# ----------------------------------------------------------------------
# 3. Device configuration
# ----------------------------------------------------------------------
DEVICE_CONFIG = {
    "device_id_file": "/var/lib/device_id.txt",
    "hhid_file": "/var/lib/hhid.txt",
    "default_meter_id": "AM100003",
    "members_file": "/var/lib/meter_members.json",
    "certs_dir": "/opt/apm/certs"
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
# 4. Load meter-id
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


def load_members_data() -> dict:
    try:
        with open(DEVICE_CONFIG["members_file"], "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"meter_id": METER_ID, "hhid": load_hhid(), "members": []}


# ----------------------------------------------------------------------
# 6. MQTT Setup – ULTRA ROBUST: logs missing certs, auto-retry, instant publish
# ----------------------------------------------------------------------
MQTT_TOPIC          = "apm/ar/events"
AWS_IOT_ENDPOINT    = "a3uoz4wfsx2nz3-ats.iot.ap-south-1.amazonaws.com"
RECONNECT_DELAY     = 5
MAX_RECONNECT_DELAY = 60

client   = None
_pub_q   = []
_q_lock  = threading.Lock()

def _mqtt_log(msg: str):
    print(f"[MQTT] {msg}")

# ----------------------------------------------------------------------
# Cert validation with detailed logging
# ----------------------------------------------------------------------
def get_cert_paths():
    certs_dir = DEVICE_CONFIG["certs_dir"]
    keyfile   = os.path.join(certs_dir, f"{METER_ID}.key")
    certfile  = os.path.join(certs_dir, f"{METER_ID}Chain.crt")
    cafile    = os.path.join(certs_dir, "AmazonRootCA1.pem")

    missing = []
    if not os.path.exists(keyfile):   missing.append(f"KEY: {keyfile}")
    if not os.path.exists(certfile):  missing.append(f"CERT: {certfile}")
    if not os.path.exists(cafile):    missing.append(f"CA: {cafile}")

    if missing:
        _mqtt_log("CERTS MISSING → " + " | ".join(missing))
        return None
    else:
        _mqtt_log(f"Certs OK: {keyfile}, {certfile}, {cafile}")
        return keyfile, certfile, cafile

# ----------------------------------------------------------------------
# Queue
# ----------------------------------------------------------------------
def _enqueue(payload: dict):
    with _q_lock:
        _pub_q.append(payload)
    _mqtt_log(f"QUEUED (size={len(_pub_q)})")

def _flush_queue():
    with _q_lock:
        to_send = _pub_q[:]
        _pub_q.clear()
    for pl in to_send:
        try:
            _mqtt_log(f"FLUSHING: {pl}")
            client.publish(MQTT_TOPIC, json.dumps(pl))
        except Exception as e:
            _mqtt_log(f"Publish failed during flush: {e}")
            # Put back if failed
            with _q_lock:
                _pub_q.extend(to_send[to_send.index(pl):])
            break

# ----------------------------------------------------------------------
# MQTT Callbacks
# ----------------------------------------------------------------------
def on_connect(client_, userdata, flags, rc, *args):
    if rc == 0:
        _mqtt_log("CONNECTED → flushing queue")
        _flush_queue()
    else:
        _mqtt_log(f"CONNECT FAILED rc={rc}")

def on_disconnect(client_, userdata, rc):
    _mqtt_log(f"DISCONNECTED rc={rc}" + (" (will reconnect)" if rc != 0 else ""))

def on_publish(client_, userdata, mid):
    _mqtt_log(f"PUBLISHED mid={mid}")

# ----------------------------------------------------------------------
# MQTT Worker Thread
# ----------------------------------------------------------------------
def _mqtt_worker():
    global client
    backoff = RECONNECT_DELAY

    while True:
        cert_paths = get_cert_paths()
        if not cert_paths:
            time.sleep(10)  # retry faster when certs are missing
            continue

        keyfile, certfile, cafile = cert_paths

        try:
            client = mqtt.Client(client_id=METER_ID, clean_session=False)
            client.tls_set(ca_certs=cafile, certfile=certfile, keyfile=keyfile,
                           tls_version=ssl.PROTOCOL_TLSv1_2)
            client.on_connect = on_connect
            client.on_disconnect = on_disconnect
            client.on_publish = on_publish

            _mqtt_log(f"Connecting to {AWS_IOT_ENDPOINT}:8883")
            client.connect(AWS_IOT_ENDPOINT, 8883, keepalive=60)
            client.loop_forever()  # blocks until disconnect
        except Exception as e:
            _mqtt_log(f"MQTT ERROR: {e}")

        _mqtt_log(f"Reconnecting in {backoff}s...")
        time.sleep(backoff)
        backoff = min(backoff * 2, MAX_RECONNECT_DELAY)

# ----------------------------------------------------------------------
# Public API
# ----------------------------------------------------------------------
def init_mqtt() -> bool:
    t = threading.Thread(target=_mqtt_worker, daemon=True)
    t.start()
    time.sleep(1)
    return True

def publish_member_event():
    data = load_members_data()
    payload = {
        "meter_id": data["meter_id"],
        "members": [
            {"age": m.get("age"), "gender": m.get("gender"), "active": m.get("active", True)}
            for m in data.get("members", [])
            if m.get("age") and m.get("gender")
        ]
    }

    if payload["members"]:  # only send if has members
        if client and client.is_connected():
            try:
                _mqtt_log(f"PUBLISHING NOW: {payload}")
                client.publish(MQTT_TOPIC, json.dumps(payload))
            except Exception as e:
                _mqtt_log(f"Publish failed: {e}")
                _enqueue(payload)
        else:
            _enqueue(payload)
    else:
        _mqtt_log("No valid members to publish")


# ----------------------------------------------------------------------
# 7. Flask routes
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


@app.route("/api/current_wifi", methods=["GET"])
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


@app.route("/api/check_gsm", methods=["GET"])
def check_gsm():
    return jsonify({"success": os.path.exists(SYSTEM_FILES["gsm_up"])})


@app.route("/api/shutdown", methods=["POST"])
def shutdown():
    try:
        subprocess.run(["sudo", "systemctl", "poweroff"], check=True)
        return jsonify({"success": True, "message": "Shutting down..."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/restart", methods=["POST"])
def restart():
    try:
        subprocess.run(["sudo", "systemctl", "reboot"], check=True)
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


@app.route("/api/input_sources", methods=["GET"])
def get_input_sources():
    sources = []
    errors = []

    if os.path.exists(SYSTEM_FILES["jack_status"]):
        try:
            status = open(SYSTEM_FILES["jack_status"]).read().strip()
            if status == "line_in":
                sources.append("line_in")
            elif status == "internal":
                sources.append("internal")
            else:
                errors.append(f"Unknown jack_status: {status}")
        except Exception as e:
            errors.append(f"Error reading jack_status: {str(e)}")

    if os.path.exists(SYSTEM_FILES["hdmi_input"]):
        sources.append("HDMI")

    if not sources and not errors:
        return jsonify({
            "success": False,
            "error": "No input sources detected",
            "sources": []
        }), 404

    return jsonify({
        "success": True,
        "sources": sources,
        "errors": errors if errors else None
    }), 200


@app.route("/api/video_detection", methods=["GET"])
def check_video_detection():
    if os.path.exists(SYSTEM_FILES["video_detection"]):
        try:
            content = open(SYSTEM_FILES["video_detection"]).read().strip()
            return jsonify({
                "success": True,
                "detected": True,
                "status": content or "active"
            }), 200
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Failed to read video_detection: {str(e)}"
            }), 500
    else:
        return jsonify({
            "success": True,
            "detected": False,
            "status": "not_running"
        }), 200


@app.route("/api/members", methods=["GET"])
def get_members():
    try:
        data = load_members_data()
        return jsonify({"success": True, "data": data}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/toggle_member_status", methods=["POST"])
def toggle_member_status():
    index = request.json.get("index")
    if index is None or not isinstance(index, int):
        return jsonify({"success": False, "error": "Invalid index"}), 400

    try:
        data = load_members_data()
        members = data.get("members", [])

        if 0 <= index < len(members):
            member = members[index]
            member["active"] = not member.get("active", False)
            save_members_data(data)
            publish_member_event()
            return jsonify({"success": True, "member": member}), 200
        else:
            return jsonify({"success": False, "error": "Index out of range"}), 400
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
            for member in data.get("members", []):
                member.setdefault("active", False)
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


@app.route("/api/brightness", methods=["POST"])
def set_brightness():
    """
    Adjust display brightness via /sys/class/backlight/10-0045.
    Expects JSON: { "brightness": <51–255> }
    """
    try:
        data = request.get_json()
        brightness = int(data.get("brightness", 51))
        path = "/sys/class/backlight/1-0045"

        # Get maximum brightness
        with open(f"{path}/max_brightness") as f:
            max_brightness = int(f.read().strip())

        # Clamp value and write it
        brightness = max(51, min(brightness, max_brightness))
        os.system(f"echo {brightness} | sudo tee {path}/brightness > /dev/null")

        print(f"[BRIGHTNESS] Set to {brightness}")
        return jsonify({"success": True, "brightness": brightness}), 200
    except Exception as e:
        print(f"[BRIGHTNESS] Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ----------------------------------------------------------------------
# 8. Flask runner
# ----------------------------------------------------------------------
def run_flask():
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False, threaded=True)


# ----------------------------------------------------------------------
# 9. PyQt5 Browser
# ----------------------------------------------------------------------
class BrowserWindow(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()
        self.browser = QWebEngineView()
        self.setCentralWidget(self.browser)
        self.setCursor(Qt.BlankCursor)
        self.showFullScreen()

        self.browser.setZoomFactor(1.0)
        settings = self.browser.settings()
        settings.setAttribute(QWebEngineSettings.ShowScrollBars, False)
        settings.setAttribute(QWebEngineSettings.JavascriptEnabled, True)

        self.browser.setAttribute(Qt.WA_AcceptTouchEvents, False)
        self.setAttribute(Qt.WA_AcceptTouchEvents, False)


        ZOOM_PREVENT_JS = """
        (function(){
            var m = document.createElement('meta');
            m.name = 'viewport';
            m.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.head.appendChild(m);
            var block = function(e){ e.preventDefault(); };
            document.addEventListener('gesturestart',  block, {passive:false});
            document.addEventListener('gesturechange', block, {passive:false});
            document.addEventListener('gestureend',    block, {passive:false});
            document.addEventListener('touchmove', function(e){
                if(e.touches.length>1) e.preventDefault();
            }, {passive:false});
            document.addEventListener('wheel', function(e){
                if(e.ctrlKey) e.preventDefault();
            }, {passive:false});
        })();
        """

        def _inject(ok: bool):
            if ok:
                self.browser.page().runJavaScript(ZOOM_PREVENT_JS)

        self.browser.loadFinished.connect(_inject)

        for seq in [QKeySequence.ZoomIn, QKeySequence.ZoomOut, "Ctrl+=", "Ctrl+-", "Ctrl+0"]:
            QShortcut(QKeySequence(seq), self, lambda: None)

        self.browser.setUrl(QUrl("http://127.0.0.1:5000"))

    def keyPressEvent(self, event):
        if event.key() == Qt.Key_F4 and event.modifiers() == Qt.AltModifier:
            self.close()
        super().keyPressEvent(event)

    def wheelEvent(self, event):
        if event.modifiers() & Qt.ControlModifier:
            event.ignore()
        else:
            super().wheelEvent(event)


# ----------------------------------------------------------------------
# 10. Main
# ----------------------------------------------------------------------
if __name__ == "__main__":
    # Start MQTT (robust, auto-reconnect, queued)
    threading.Thread(target=init_mqtt, daemon=True).start()
    time.sleep(2)

    # Start Flask
    threading.Thread(target=run_flask, daemon=True).start()
    time.sleep(1.5)

    # Start Qt
    qt_app = QtWidgets.QApplication(sys.argv)
    win = BrowserWindow()
    win.show()
    sys.exit(qt_app.exec_())
    