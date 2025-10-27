from flask import Flask, render_template, request, jsonify
import os
import json
import time
import queue
import threading
import paho.mqtt.client as mqtt
import ssl
import subprocess
from typing import Dict, List, Tuple
from PyQt5 import QtWidgets, QtCore
from PyQt5.QtCore import QUrl, Qt
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEngineSettings
from PyQt5.QtGui import QKeySequence
from PyQt5.QtWidgets import QShortcut
import sys

# Set environment variables for Qt WebEngine
os.environ['QTWEBENGINE_CHROMIUM_FLAGS'] = '--no-sandbox'
os.environ['XDG_RUNTIME_DIR'] = '/tmp/runtime-root'
os.makedirs('/tmp/runtime-root', exist_ok=True)
os.chmod('/tmp/runtime-root', 0o700)


app = Flask(__name__, static_folder='static', template_folder='templates')

# Configuration
MQTT_CONFIG = {
    "host": "a3uoz4wfsx2nz3-ats.iot.ap-south-1.amazonaws.com",
    "port": 8883,
    "keepalive": 60
}

DEVICE_CONFIG = {
    "device_id_file": "/var/lib/device_id.txt",
    "hhid_file": "/var/lib/hhid.txt",
    "cert_path": "/opt/apm/certs/{meter_id}Chain.crt",
    "key_path": "/opt/apm/certs/{meter_id}.key",
    "ca_path": "/opt/apm/certs/AmazonRootCA1.pem",
    "default_meter_id": "default_meter123",
    "members_file": "/var/lib/meter_members.json"
}

SYSTEM_FILES = {
    "install_done": "/var/lib/self_installation_done",
    "wifi_up": "/run/wifi_network_up",
    "gsm_up": "/run/gsm_network_up",
    "jack_status": "/run/jack_status",
    "hdmi_input": "/run/input_source_hdmi",
    "video_detection": "/run/video_object_detection"
}

# Initialize device ID
try:
    with open(DEVICE_CONFIG["device_id_file"], 'r') as f:
        METER_ID = f.read().strip()
except FileNotFoundError:
    METER_ID = DEVICE_CONFIG["default_meter_id"]
print(f"Initialized METER_ID: {METER_ID}")

# Format certificate paths
CERT_PATH = DEVICE_CONFIG["cert_path"].format(meter_id=METER_ID)
KEY_PATH = DEVICE_CONFIG["key_path"].format(meter_id=METER_ID)
CA_PATH = DEVICE_CONFIG["ca_path"]

# Validate certificate files
for path in [CERT_PATH, KEY_PATH, CA_PATH]:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Certificate file not found: {path}")

# MQTT Client setup
client = mqtt.Client(client_id=METER_ID)
client.tls_set(ca_certs=CA_PATH, certfile=CERT_PATH, keyfile=KEY_PATH, tls_version=ssl.PROTOCOL_TLSv1_2)
client.tls_insecure_set(True)  # Set to False in production

response_queue = queue.Queue()
members_queue = queue.Queue()
processed_event_ids = set()

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"MQTT Connected successfully with client ID: {METER_ID}")
        client.subscribe(f"apm/armenia/meter/incoming/{METER_ID}")
        client.subscribe(f"apm/armenia/meter/otp/incoming/{METER_ID}")
        client.subscribe(f"apm/armenia/meter/members/incoming/{METER_ID}")
        print(f"Subscribed to: apm/armenia/meter/incoming/{METER_ID}, apm/armenia/meter/otp/incoming/{METER_ID}, apm/armenia/meter/members/incoming/{METER_ID}")
    else:
        print(f"MQTT Connection failed with code {rc}")

def on_disconnect(client, userdata, rc):
    print(f"MQTT Disconnected with code {rc}. Attempting to reconnect...")
    while True:
        try:
            client.reconnect()
            print("MQTT Reconnected successfully")
            break
        except Exception as e:
            print(f"Reconnection failed: {str(e)}. Retrying in 5 seconds...")
            time.sleep(5)

def on_message(client, userdata, msg):
    try:
        print(f"Received MQTT message on topic {msg.topic}: {msg.payload.decode()}")
        payload = json.loads(msg.payload.decode())
        event_id = payload.get('eventId')
        if event_id and event_id in processed_event_ids:
            print(f"Duplicate MQTT message with eventId {event_id}, skipping")
            return
        if event_id:
            processed_event_ids.add(event_id)
            if len(processed_event_ids) > 1000:
                old_events = list(processed_event_ids)[:len(processed_event_ids) - 1000]
                for eid in old_events:
                    processed_event_ids.remove(eid)

        if msg.topic == f"apm/armenia/meter/incoming/{METER_ID}":
            if "valid" in payload:
                print(f"Processing HHID response: {payload}")
                response_queue.put({"type": "hhid", "valid": payload["valid"]})
            else:
                print(f"Invalid HHID payload: {payload}")
        elif msg.topic == f"apm/armenia/meter/otp/incoming/{METER_ID}":
            if "otpValid" in payload:
                print(f"Processing OTP response: {payload}")
                response_queue.put({"type": "otp", "valid": payload["otpValid"]})
            else:
                print(f"Invalid OTP payload: {payload}")
        elif msg.topic == f"apm/armenia/meter/members/incoming/{METER_ID}":
            print(f"Processing members payload: {payload}")
            members_queue.put(payload)
    except Exception as e:
        print(f"Error processing MQTT message: {str(e)}")

client.on_connect = on_connect
client.on_disconnect = on_disconnect
client.on_message = on_message

def start_mqtt():
    while True:
        try:
            print(f"Attempting to connect to MQTT broker: {MQTT_CONFIG['host']}:{MQTT_CONFIG['port']}")
            client.connect(MQTT_CONFIG["host"], MQTT_CONFIG["port"], MQTT_CONFIG["keepalive"])
            client.loop_forever()
        except Exception as e:
            print(f"MQTT connection failed: {str(e)}. Retrying in 5 seconds...")
            time.sleep(5)

# Start MQTT thread
mqtt_thread = threading.Thread(target=start_mqtt, daemon=True)
mqtt_thread.start()

def is_installation_done() -> bool:
    try:
        if not os.path.exists(SYSTEM_FILES["install_done"]):
            print(f"Creating {SYSTEM_FILES['install_done']} with initial value 0")
            with open(SYSTEM_FILES["install_done"], 'w') as f:
                f.write('0')
        with open(SYSTEM_FILES["install_done"], 'r') as f:
            content = f.read().strip()
            print(f"Read {SYSTEM_FILES['install_done']}: {content}")
            return content == '1'
    except Exception as e:
        print(f"Error checking installation done: {str(e)}")
        return False

def set_installation_done():
    try:
        print(f"Writing 1 to {SYSTEM_FILES['install_done']}")
        with open(SYSTEM_FILES["install_done"], 'w') as f:
            f.write('1')
        print(f"Successfully set {SYSTEM_FILES['install_done']} to 1")
    except Exception as e:
        print(f"Failed to set installation done: {str(e)}")
        raise

def save_members_data():
    try:
        members_data = members_queue.get_nowait()
        print(f"Saving members data: {members_data}")
        with open(DEVICE_CONFIG["members_file"], 'w') as f:
            json.dump(members_data, f, indent=2)
        print(f"Members data saved to {DEVICE_CONFIG['members_file']}")
    except queue.Empty:
        print(f"No members data available in queue, saving empty data to {DEVICE_CONFIG['members_file']}")
        members_data = {"meterid": METER_ID, "hhid": "", "members": []}
        with open(DEVICE_CONFIG["members_file"], 'w') as f:
            json.dump(members_data, f, indent=2)
        print(f"Empty members data saved to {DEVICE_CONFIG['members_file']}")
    except Exception as e:
        print(f"Failed to save members data: {str(e)}")
        raise

def save_hhid(hhid: str):
    try:
        print(f"Saving HHID {hhid} to {DEVICE_CONFIG['hhid_file']}")
        with open(DEVICE_CONFIG["hhid_file"], 'w') as f:
            f.write(hhid)
        print(f"Successfully saved HHID to {DEVICE_CONFIG['hhid_file']}")
    except Exception as e:
        print(f"Failed to save HHID: {str(e)}")
        raise

def load_hhid() -> str:
    try:
        with open(DEVICE_CONFIG["hhid_file"], 'r') as f:
            hhid = f.read().strip()
            print(f"Loaded HHID: {hhid}")
            return hhid
    except FileNotFoundError:
        print(f"HHID file not found: {DEVICE_CONFIG['hhid_file']}")
        return ""
    except Exception as e:
        print(f"Error loading HHID: {str(e)}")
        return ""

def publish_shutdown_message() -> None:
    try:
        payload = {"meter_id": METER_ID, "status": "shutdown", "timestamp": int(time.time())}
        client.publish(f"apm/armenia/meter/status/{METER_ID}", json.dumps(payload))
        print(f"Published shutdown message: {payload}")
    except Exception as e:
        print(f"Failed to publish shutdown message: {str(e)}")

def run_system_command(command: List[str]) -> Tuple[bool, str]:
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/check_installation', methods=['GET'])
def check_installation():
    return jsonify({"installed": is_installation_done(), "meter_id": METER_ID})

@app.route('/api/check_wifi', methods=['GET'])
def check_wifi():
    try:
        file_path = SYSTEM_FILES["wifi_up"]
        if os.path.exists(file_path):
            print(f"Wi-Fi network up file exists: {file_path}")
            return jsonify({"success": True})
        else:
            print(f"Wi-Fi network up file not found: {file_path}")
            return jsonify({"success": False, "error": "Wi-Fi network not up"})
    except PermissionError as e:
        print(f"Permission error accessing Wi-Fi network up file: {str(e)}")
        return jsonify({"success": False, "error": f"Permission error: {str(e)}"})
    except Exception as e:
        print(f"Error accessing Wi-Fi network up file: {str(e)}")
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"})

@app.route('/api/current_wifi', methods=['GET'])
def current_wifi():
    try:
        check_cmd = ['nmcli', '-t', '-f', 'NAME,TYPE,DEVICE', 'connection', 'show', '--active']
        success, output = run_system_command(check_cmd)
        if not success:
            print(f"Failed to check active connections: {output}")
            return jsonify({"success": False, "error": "Failed to check active connections"}), 500

        wifi_connection = None
        for line in output.strip().split('\n'):
            if line and ':wifi:' in line:
                parts = line.split(':')
                if len(parts) >= 3 and parts[2].startswith('wlan'):
                    wifi_connection = parts[0]
                    break

        if wifi_connection:
            print(f"Current Wi-Fi connection: {wifi_connection}")
            return jsonify({"success": True, "ssid": wifi_connection})
        else:
            status_cmd = ['nmcli', '-t', '-f', 'DEVICE,STATE', 'device', 'status']
            success, status_output = run_system_command(status_cmd)
            if success and 'wlan0:connected' in status_output:
                conn_cmd = ['nmcli', '-t', '-f', 'NAME', 'connection', 'show', '--active']
                success, conn_output = run_system_command(conn_cmd)
                if success and conn_output.strip():
                    wifi_connection = conn_output.strip().split('\n')[0]
                    print(f"Fallback found Wi-Fi connection: {wifi_connection}")
                    return jsonify({"success": True, "ssid": wifi_connection})
            print("No active Wi-Fi connection found")
            return jsonify({"success": False, "error": "No active Wi-Fi connection"})
    except Exception as e:
        print(f"Error checking current Wi-Fi: {str(e)}")
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/wifi/connect', methods=['POST'])
def wifi_connect():
    data = request.json
    ssid = data.get('ssid')
    password = data.get('password')

    if not ssid or not password:
        return jsonify({"success": False, "error": "SSID and password are required"}), 400

    try:
        check_cmd = ['nmcli', '-t', '-f', 'NAME', 'connection', 'show']
        success, output = run_system_command(check_cmd)
        if not success:
            print(f"Failed to check existing networks: {output}")
            return jsonify({"success": False, "error": "Failed to check existing networks"}), 500

        if ssid in output.strip().split('\n'):
            success, _ = run_system_command(['sudo', 'nmcli', 'connection', 'delete', ssid])
            if not success:
                print(f"Failed to remove existing network: {ssid}")
                return jsonify({"success": False, "error": "Failed to remove existing network"}), 500

        connect_cmd = ['sudo', 'nmcli', 'device', 'wifi', 'connect', ssid, 'password', password]
        success, output = run_system_command(connect_cmd)
        if success:
            print(f"Connected to Wi-Fi network: {ssid}")
            return jsonify({"success": True, "message": "Connected successfully"}), 200
        else:
            print(f"Failed to connect to Wi-Fi network: {ssid}, error: {output}")
            return jsonify({"success": False, "error": output or "Connection failed"}), 500
    except Exception as e:
        print(f"Error connecting to Wi-Fi: {str(e)}")
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/wifi/disconnect', methods=['POST'])
def wifi_disconnect():
    try:
        check_cmd = ['nmcli', '-t', '-f', 'NAME,TYPE', 'connection', 'show', '--active']
        success, output = run_system_command(check_cmd)
        if not success:
            print(f"Failed to check active connections: {output}")
            return jsonify({"success": False, "error": "Failed to check active connections"}), 500

        wifi_connection = None
        for line in output.strip().split('\n'):
            if line and ':wifi' in line:
                wifi_connection = line.split(':')[0]
                break

        if wifi_connection:
            disconnect_cmd = ['sudo', 'nmcli', 'device', 'disconnect', 'wlan0']
            success, _ = run_system_command(disconnect_cmd)
            if success:
                print(f"Disconnected from Wi-Fi network: {wifi_connection}")
                return jsonify({"success": True, "message": f"Disconnected from {wifi_connection}"}), 200
            else:
                print(f"Failed to disconnect from Wi-Fi network: {wifi_connection}")
                return jsonify({"success": False, "error": "Failed to disconnect"}), 500
        else:
            print("No active Wi-Fi connection found")
            return jsonify({"success": True, "message": "No active Wi-Fi connection"}), 200
    except Exception as e:
        print(f"Error disconnecting from Wi-Fi: {str(e)}")
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/wifi/networks', methods=['GET'])
def list_wifi_networks():
    try:
        success, _ = run_system_command(['sudo', 'nmcli', 'device', 'wifi', 'rescan'])
        if not success:
            print("Failed to scan Wi-Fi networks")
            return jsonify({"success": False, "error": "Failed to scan networks"}), 500

        list_cmd = ['nmcli', '-t', '-f', 'SSID,SIGNAL,SECURITY', 'device', 'wifi', 'list']
        success, output = run_system_command(list_cmd)
        if not success:
            print(f"Failed to list Wi-Fi networks: {output}")
            return jsonify({"success": False, "error": "Failed to list networks"}), 500

        networks = []
        for line in output.strip().split('\n'):
            if line:
                parts = line.split(':')
                if len(parts) >= 3 and parts[0]:
                    networks.append({
                        "ssid": parts[0],
                        "signal_strength": f"{parts[1]}%",
                        "security": parts[2] if parts[2] else "None"
                    })

        print(f"Listed Wi-Fi networks: {networks}")
        return jsonify({"success": True, "networks": networks}), 200
    except Exception as e:
        print(f"Error listing Wi-Fi networks: {str(e)}")
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/shutdown', methods=['POST'])
def shutdown():
    try:
        publish_shutdown_message()
        success, output = run_system_command(['sudo', 'shutdown', '-h', 'now'])
        if success:
            print("System shutting down")
            return jsonify({"success": True, "message": "System shutting down..."}), 200
        else:
            print(f"Shutdown failed: {output}")
            return jsonify({"success": False, "error": output or "Shutdown failed"}), 500
    except Exception as e:
        print(f"Error during shutdown: {str(e)}")
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/restart', methods=['POST'])
def restart():
    try:
        publish_shutdown_message()
        success, output = run_system_command(['sudo', 'reboot'])
        if success:
            print("System restarting")
            return jsonify({"success": True, "message": "System restarting..."}), 200
        else:
            print(f"Restart failed: {output}")
            return jsonify({"success": False, "error": output or "Restart failed"}), 500
    except Exception as e:
        print(f"Error during restart: {str(e)}")
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/network_test', methods=['POST'])
def network_test():
    mode = request.json.get('mode', 'wifi')
    network_up = os.path.exists(SYSTEM_FILES["wifi_up"]) if mode == 'wifi' else os.path.exists(SYSTEM_FILES["gsm_up"])
    print(f"Network test: mode={mode}, network_up={network_up}")
    return jsonify({"success": network_up})

@app.route('/api/submit_hhid', methods=['POST'])
def submit_hhid():
    hhid = request.json.get('hhid')
    if not hhid:
        print("HHID is required")
        return jsonify({"success": False, "error": "HHID is required"}), 400

    try:
        save_hhid(hhid)
        payload = {"meterid": METER_ID, "hhid": hhid}
        print(f"Publishing HHID payload: {payload}")
        client.publish(f"apm/armenia/meter/{METER_ID}", json.dumps(payload))
        response = response_queue.get(timeout=30)
        print(f"Received HHID response: {response}")
        return jsonify({"success": response['type'] == 'hhid' and response['valid']})
    except queue.Empty:
        print("Timeout waiting for HHID response")
        return jsonify({"success": False, "error": "Timeout waiting for HHID response"}), 504
    except Exception as e:
        print(f"Error processing HHID submission: {str(e)}")
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/submit_otp', methods=['POST'])
def submit_otp():
    data = request.json
    otp = data.get('otp')
    hhid = data.get('hhid')
    if not otp or not hhid:
        print("OTP and HHID are required")
        return jsonify({"success": False, "error": "OTP and HHID are required"}), 400

    payload = {"meterid": METER_ID, "hhid": hhid, "otp": otp}
    print(f"Publishing OTP payload: {payload}")
    client.publish(f"apm/armenia/meter/otp/{METER_ID}", json.dumps(payload))
    try:
        response = response_queue.get(timeout=30)
        print(f"Received OTP response: {response}")
        return jsonify({"success": response['type'] == 'otp' and response['valid']})
    except queue.Empty:
        print("Timeout waiting for OTP response")
        return jsonify({"success": False, "error": "Timeout waiting for OTP response"}), 504

@app.route('/api/members', methods=['GET'])
def get_members():
    try:
        with open(DEVICE_CONFIG["members_file"], 'r') as f:
            members_data = json.load(f)
        members_data["hhid"] = load_hhid()  # Load HHID from file
        print(f"Read members data: {members_data}")
        return jsonify({"success": True, "data": members_data}), 200
    except FileNotFoundError:
        print(f"Members file not found: {DEVICE_CONFIG['members_file']}")
        return jsonify({"success": False, "error": "Members data not found"}), 404
    except json.JSONDecodeError as e:
        print(f"Invalid JSON in members file: {str(e)}")
        return jsonify({"success": False, "error": f"Invalid JSON in members file: {str(e)}"}), 500
    except Exception as e:
        print(f"Error reading members data: {str(e)}")
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/input_sources', methods=['GET'])
def input_sources():
    sources = []
    try:
        with open(SYSTEM_FILES["jack_status"], 'r') as f:
            jack = f.read().strip()
            sources.append(jack)
    except FileNotFoundError:
        pass
    if os.path.exists(SYSTEM_FILES["hdmi_input"]):
        sources.append("HDMI")
    print(f"Input sources: {sources}")
    return jsonify({"success": True, "sources": sources})

@app.route('/api/video_detection', methods=['GET'])
def video_detection():
    try:
        file_path = SYSTEM_FILES["video_detection"]
        if os.path.exists(file_path):
            print(f"Video detection file exists: {file_path}")
            return jsonify({"success": True})
        else:
            print(f"Video detection file not found: {file_path}")
            return jsonify({"success": False, "error": "Video detection file not found"})
    except PermissionError as e:
        print(f"Permission error accessing video detection file: {str(e)}")
        return jsonify({"success": False, "error": f"Permission error: {str(e)}"})
    except Exception as e:
        print(f"Error accessing video detection file: {str(e)}")
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"})

@app.route('/api/installation_details', methods=['GET'])
def installation_details():
    try:
        details = {
            "meter_id": METER_ID,
            "hhid": load_hhid(),
            "connectivity": "Unknown",
            "input_sources": [],
            "video_detection": False
        }

        if os.path.exists(SYSTEM_FILES["wifi_up"]):
            details["connectivity"] = "Wi-Fi"
            wifi_response = current_wifi()
            if wifi_response.get_json().get("success"):
                details["connectivity"] = f"Wi-Fi ({wifi_response.get_json().get('ssid', 'Unknown')})"
        elif os.path.exists(SYSTEM_FILES["gsm_up"]):
            details["connectivity"] = "GSM"

        sources_response = input_sources()
        if sources_response.get_json().get("success"):
            details["input_sources"] = sources_response.get_json().get("sources", [])

        video_response = video_detection()
        details["video_detection"] = video_response.get_json().get("success", False)

        print(f"Installation details: {details}")
        return jsonify({"success": True, "details": details}), 200
    except Exception as e:
        print(f"Error fetching installation details: {str(e)}")
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/finalize', methods=['POST'])
def finalize():
    try:
        print("Finalizing installation...")
        set_installation_done()
        save_members_data()
        print("Installation finalized successfully")
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error finalizing installation: {str(e)}")
        return jsonify({"success": False, "error": f"Failed to finalize: {str(e)}"}), 500

@app.route('/close')
def close_application():
    QtCore.QCoreApplication.quit()
    return 'Closing application'

class MyApp(QtWidgets.QMainWindow):
    def __init__(self):
        super(MyApp, self).__init__()
        self.browser = QWebEngineView()
        self.setCentralWidget(self.browser)
        self.showFullScreen()

        # Enhanced zoom prevention settings
        self.browser.setZoomFactor(1.0)
        self.browser.settings().setAttribute(QWebEngineSettings.ShowScrollBars, False)
        self.browser.settings().setAttribute(QWebEngineSettings.ScrollAnimatorEnabled, False)
        self.browser.settings().setAttribute(QWebEngineSettings.JavascriptEnabled, True)

        # Disable touch and gesture events
        self.browser.setAttribute(Qt.WA_AcceptTouchEvents, False)
        self.setAttribute(Qt.WA_AcceptTouchEvents, False)

        # JavaScript to prevent zooming
        zoom_prevention_js = """
            document.addEventListener('touchstart', function(e) {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, { passive: false });
            document.addEventListener('touchmove', function(e) {
                if (e.touches.length > 1 || e.scale !== undefined && e.scale !== 1) {
                    e.preventDefault();
                }
            }, { passive: false });
            document.addEventListener('gesturestart', function(e) {
                e.preventDefault();
            }, { passive: false });
            document.addEventListener('gesturechange', function(e) {
                e.preventDefault();
            }, { passive: false });
            document.addEventListener('gestureend', function(e) {
                e.preventDefault();
            }, { passive: false });
            document.addEventListener('dblclick', function(e) {
                e.preventDefault();
            }, { passive: false });
            var meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.getElementsByTagName('head')[0].appendChild(meta);
            document.body.style.zoom = '1.0';
            document.body.style.touchAction = 'none';
        """

        # Inject zoom prevention JavaScript
        self.browser.page().loadFinished.connect(lambda: self.browser.page().runJavaScript(zoom_prevention_js))

        # Disable keyboard zoom shortcuts
        self.disable_zoom_shortcuts()

        # Load the application URL
        self.browser.setUrl(QUrl("http://127.0.0.1:5000"))

    def disable_zoom_shortcuts(self):
        shortcuts = [
            QKeySequence.ZoomIn,
            QKeySequence.ZoomOut,
            QKeySequence("Ctrl+="),
            QKeySequence("Ctrl+-"),
            QKeySequence("Ctrl+0"),
            QKeySequence("Ctrl++"),
            QKeySequence("Ctrl+wheel"),
        ]
        for shortcut in shortcuts:
            QShortcut(shortcut, self, lambda: None)

    def keyPressEvent(self, event):
        if event.key() == QtCore.Qt.Key_F4 and event.modifiers() == QtCore.Qt.AltModifier:
            self.close()
        elif event.modifiers() & QtCore.Qt.ControlModifier:
            if event.key() in [QtCore.Qt.Key_Plus, QtCore.Qt.Key_Minus, QtCore.Qt.Key_0]:
                return
        super().keyPressEvent(event)

    def wheelEvent(self, event):
        if event.modifiers() & QtCore.Qt.ControlModifier:
            event.ignore()
        else:
            super().wheelEvent(event)

def run_flask():
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)

if __name__ == '__main__':
    # Start Flask in a separate thread
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    # Start PyQt application
    qt_app = QtWidgets.QApplication(sys.argv)
    window = MyApp()
    window.show()
    sys.exit(qt_app.exec_())