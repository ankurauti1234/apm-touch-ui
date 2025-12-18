#!/usr/bin/env python3
# src/mqtt.py
import os
import threading
import time
import json
import ssl
import paho.mqtt.client as mqtt
from datetime import datetime

# ----------------------------------------------------------------------
# MQTT Configuration
# ----------------------------------------------------------------------
from src.config import METER_ID, DEVICE_CONFIG

MQTT_TOPIC       = "indi/AM/meter"
AWS_IOT_ENDPOINT = "a3uoz4wfsx2nz3-ats.iot.ap-south-1.amazonaws.com"
RECONNECT_DELAY  = 5
MAX_RECONNECT_DELAY = 60

client   = None
_pub_q   = []
_q_lock  = threading.Lock()

def _mqtt_log(msg: str):
    print(f"[MQTT] {msg}")

# ----------------------------------------------------------------------
# Cert validation
# ----------------------------------------------------------------------
def get_cert_paths():
    certs_dir = DEVICE_CONFIG["certs_dir"]  # now "/opt/apm/certs"

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
            with _q_lock:
                _pub_q.extend(to_send[to_send.index(pl):])
            break

# ----------------------------------------------------------------------
# Callbacks
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
# Worker
# ----------------------------------------------------------------------
def _mqtt_worker():
    global client
    backoff = RECONNECT_DELAY

    while True:
        cert_paths = get_cert_paths()
        if not cert_paths:
            time.sleep(10)
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
            client.loop_forever()
        except Exception as e:
            _mqtt_log(f"MQTT ERROR: {e}")

        _mqtt_log(f"Reconnecting in {backoff}s...")
        time.sleep(backoff)
        backoff = min(backoff * 2, MAX_RECONNECT_DELAY)

# ----------------------------------------------------------------------
# Public functions
# ----------------------------------------------------------------------
def start_mqtt():
    t = threading.Thread(target=_mqtt_worker, daemon=True)
    t.start()
    time.sleep(1.5)   # give it time to try connecting

def wait_for_publish_success(client, payload_json: str, timeout: float = 10.0) -> bool:
    if not client or not client.is_connected():
        return False

    success = False
    event = threading.Event()

    def on_publish_temp(client_, userdata, mid):
        nonlocal success
        success = True
        event.set()

    original = client.on_publish
    client.on_publish = on_publish_temp

    try:
        result = client.publish(MQTT_TOPIC, payload_json)
        if result.rc != mqtt.MQTT_ERR_SUCCESS:
            return False
        event.wait(timeout=timeout)
        return success
    finally:
        client.on_publish = original

def publish_member_event():
    from src.users.members import load_members_data, save_members_data
    data = load_members_data()
    members = [
        {
            "member_code": m.get("member_code", ""),
            "age": calculate_age(m["dob"]),
            "gender": m["gender"],
            "active": m.get("active", False)
        }
        for m in data.get("members", [])
        if all(k in m for k in ["dob", "gender"])
    ]

    payload = {
        "DEVICE_ID": METER_ID,
        "TS": str(int(time.time())),
        "Type": 3,
        "Details": {"members": members}
    }

    payload_json = json.dumps(payload)

    if members:
        if client and client.is_connected():
            try:
                _mqtt_log(f"PUBLISHING: {payload}")
                client.publish(MQTT_TOPIC, payload_json)
            except Exception as e:
                _mqtt_log(f"Publish failed: {e}")
                _enqueue(payload)
        else:
            _enqueue(payload)
    else:
        _mqtt_log("No valid members to publish")

def calculate_age(dob_str):
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d")
        today = datetime.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age
    except Exception:
        return None

# Export what other modules need
__all__ = [
    'start_mqtt',
    'client',
    'publish_member_event',
    'wait_for_publish_success',
    '_enqueue',
    '_mqtt_log'
]