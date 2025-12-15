#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# ──────────────────────────────────────────────────────────────
# Standard library
# ──────────────────────────────────────────────────────────────
import os
import threading
import time

# ──────────────────────────────────────────────────────────────
# Third-party
# ──────────────────────────────────────────────────────────────
import requests
from flask import Flask, render_template
from flask_cors import CORS

# ──────────────────────────────────────────────────────────────
# Local modules
# ──────────────────────────────────────────────────────────────
from src.mqtt import start_mqtt
from src.settings.wifi import wifi_bp
from src.settings.system_settings import system_settings_bp
from src.installation.assignment import assignment_bp
from src.installation.system_files import system_files_bp
from src.users.members import members_bp
from src.users.guests import guests_bp

from src.config import METER_ID, DEVICE_CONFIG, SYSTEM_FILES


# ----------------------------------------------------------------------
# Flask application — BULLETPROOF PATH RESOLUTION (works on Raspberry Pi, WSL, everywhere)
# ----------------------------------------------------------------------
def get_project_root():
    """Return absolute path to project root, no matter where we run from."""
    # If this file is in src/ → go up one level
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if os.path.basename(current_dir) == "src":
        return os.path.dirname(current_dir)
    # Fallback: current working directory
    return os.getcwd()

PROJECT_ROOT = get_project_root()

app = Flask(
    __name__,
    template_folder=os.path.join(PROJECT_ROOT, "templates"),
    static_folder=os.path.join(PROJECT_ROOT, "static")
)
CORS(app)

# Register blueprints
app.register_blueprint(wifi_bp)
app.register_blueprint(system_settings_bp)
app.register_blueprint(assignment_bp)
app.register_blueprint(system_files_bp)
app.register_blueprint(members_bp)
app.register_blueprint(guests_bp)


# ----------------------------------------------------------------------
# Core routes
# ----------------------------------------------------------------------
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/close")
def close_application():
    from PyQt5.QtCore import QCoreApplication
    QCoreApplication.quit()
    return "Closing..."