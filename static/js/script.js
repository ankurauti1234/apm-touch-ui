// === CONFIG ===
const API_BASE = "https://bt72jq8w9i.execute-api.ap-south-1.amazonaws.com/test";
const INITIATE_URL = `${API_BASE}/initiate-assignment`;
const VERIFY_URL = `${API_BASE}/verify-otp`;
const MEMBERS_URL = `${API_BASE}/members`;

// === UI ELEMENTS ===
const container = document.getElementById('main-content');
const progressBar = document.getElementById('progress-bar');
let currentState = 'loading';
let meterId = '';
let hhid = '';
let connectivityMode = '';
let inputSources = [];
let membersData = null;
let activeInput = null;

// === STEPS ===
const steps = [
    { id: 'welcome', label: 'Start' },
    { id: 'connect_select', label: 'Connect' },
    { id: 'network_test', label: 'Network' },
    { id: 'display_meter', label: 'Meter ID' },
    { id: 'hhid_input', label: 'HHID' },
    { id: 'otp_verification', label: 'OTP' },
    { id: 'input_source_detection', label: 'Inputs' },
    { id: 'video_object_detection', label: 'Video' },
    { id: 'finalize', label: 'Summary' },
    { id: 'main', label: 'Complete' }
];

// === STATE TEMPLATES ===
const states = {
    loading: () => `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading system...</p>
        </div>
    `,
    welcome: () => `
        <h1>Welcome to Touch Meter</h1>
        <p>Begin the installation process for your meter system.</p>
        <div class="separator"></div>
        <div class="button-group">
            <button class="button" onclick="navigate('connect_select')">
                <span class="material-icons">play_arrow</span>
                Start Installation
            </button>
        </div>
    `,
    connect_select: (currentSSID = null) => `
        <h1>Select Connectivity</h1>
        <p>Choose your preferred connection method</p>
        <div id="error" class="error" style="display: none;"></div>
        ${currentSSID ? `
            <div style="padding: 1rem; background: hsl(var(--muted)); border-radius: var(--radius); margin: 1rem 0;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span class="material-icons" style="color: hsl(var(--primary));">wifi</span>
                    <strong>Connected to Wi-Fi</strong>
                </div>
                <p style="margin: 0; padding-left: 2rem;">${currentSSID}</p>
            </div>
            <div class="button-group">
                <button class="button" onclick="navigate('network_test', 'wifi')">
                    <span class="material-icons">arrow_forward</span>
                    Continue with Wi-Fi
                </button>
                <button class="button secondary" onclick="showWiFiPopup()">
                    <span class="material-icons">settings</span>
                    Change Wi-Fi
                </button>
                <button class="button secondary" onclick="navigate('connect_select')">
                    <span class="material-icons">refresh</span>
                    Refresh
                </button>
            </div>
        ` : `
            <div class="button-group">
                <button class="button" onclick="checkWiFi()">
                    <span class="material-icons">wifi</span>
                    Wi-Fi
                </button>
                <button class="button" onclick="navigate('network_test', 'gsm')">
                    <span class="material-icons">cell_tower</span>
                    GSM
                </button>
            </div>
        `}
    `,
    network_test: (status = null) => `
        <h1>Network Test</h1>
        <p>Verifying ${connectivityMode.toUpperCase()} connection</p>
        <div id="error" class="error" style="display: none;"></div>
        ${status === 'success' ? `
            <div class="success">
                <span class="material-icons">check_circle</span>
                Network test successful!
            </div>
            <div class="button-group">
                <button class="button" onclick="navigate('display_meter')">
                    <span class="material-icons">arrow_forward</span>
                    Next
                </button>
                <button class="button secondary" onclick="navigate('network_test', '${connectivityMode}')">
                    <span class="material-icons">refresh</span>
                    Retry
                </button>
            </div>
        ` : status === 'error' ? `
            <div class="error" style="display: flex;">
                <span class="material-icons">error</span>
                Network test failed. Please check your connection.
            </div>
            <div class="button-group">
                <button class="button" onclick="navigate('network_test', '${connectivityMode}')">
                    <span class="material-icons">refresh</span>
                    Retry
                </button>
                <button class="button secondary" onclick="navigate('connect_select')">
                    <span class="material-icons">arrow_back</span>
                    Back
                </button>
            </div>
        ` : `
            <div class="loading">
                <div class="spinner"></div>
                <p>Testing connection...</p>
            </div>
        `}
    `,
    display_meter: () => `
        <h1>Meter ID</h1>
        <p>Your meter identification number</p>
        <div style="padding: 1.5rem; background: hsl(var(--muted)); border-radius: var(--radius); margin: 1.5rem 0; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <span class="material-icons" style="color: hsl(var(--primary)); font-size: 2rem;">electric_meter</span>
            </div>
            <strong style="font-size: 1.5rem; color: hsl(var(--foreground));">${meterId}</strong>
        </div>
        <div class="button-group">
            <button class="button" onclick="navigate('hhid_input')">
                <span class="material-icons">arrow_forward</span>
                Next
            </button>
        </div>
    `,
    hhid_input: () => `
        <h1>Enter Household ID</h1>
        <p>Please provide your household identification number</p>
        <div id="error" class="error" style="display: none;"></div>
        <input type="text" id="hhid" placeholder="Enter HHID (e.g. HH1002)" onfocus="showKeyboard(this)">
        <div class="button-group">
            <button class="button" onclick="submitHHID()">
                <span class="material-icons">send</span>
                Submit & Send OTP
            </button>
            <button class="button secondary" onclick="navigate('display_meter')">
                <span class="material-icons">arrow_back</span>
                Back
            </button>
        </div>
    `,
    otp_verification: () => `
        <h1>Enter OTP</h1>
        <p>Check your email. Enter the 4-digit code.</p>
        <div id="error" class="error" style="display: none;"></div>
        <input type="text" id="otp" placeholder="Enter 4-digit OTP" maxlength="4" onfocus="showKeyboard(this)">
        <div class="button-group">
            <button class="button" onclick="submitOTP()">
                <span class="material-icons">verified</span>
                Verify OTP
            </button>
            <button class="button secondary" onclick="navigate('hhid_input')">
                <span class="material-icons">arrow_back</span>
                Back
            </button>
        </div>
    `,
    input_source_detection: () => `
        <h1>Input Sources</h1>
        <p>Detected input sources on your system</p>
        <div id="error" class="error" style="display: none;"></div>
        <ul>
            ${inputSources.length ? inputSources.map(s => `
                <li><span class="material-icons">input</span> ${s}</li>
            `).join('') : '<li><span class="material-icons">info</span>No sources detected</li>'}
        </ul>
        <div class="button-group">
            <button class="button" onclick="navigate('video_object_detection')">
                <span class="material-icons">arrow_forward</span>
                Next
            </button>
            <button class="button secondary" onclick="navigate('otp_verification')">
                <span class="material-icons">arrow_back</span>
                Back
            </button>
        </div>
    `,
    video_object_detection: () => `
        <h1>Video Detection</h1>
        <p>Checking video object detection capabilities</p>
        <div id="error" class="error" style="display: none;"></div>
        <div class="loading">
            <div class="spinner"></div>
            <p>Running detection test...</p>
        </div>
    `,
    finalize: (details) => `
        <h1>Installation Summary</h1>
        <p>Review your installation details</p>
        <div id="error" class="error" style="display: none;"></div>
        <table class="details-table">
            <tr><th><span class="material-icons">electric_meter</span>Meter ID</th><td>${details.meter_id}</td></tr>
            <tr><th><span class="material-icons">home</span>Household ID</th><td>${details.hhid || 'Not set'}</td></tr>
            <tr><th><span class="material-icons">signal_cellular_alt</span>Connectivity</th><td>${details.connectivity}</td></tr>
            <tr><th><span class="material-icons">input</span>Input Sources</th><td>${details.input_sources.join(', ') || 'None'}</td></tr>
            <tr><th><span class="material-icons">videocam</span>Video Detection</th><td>${details.video_detection ? 'Working' : 'Not working'}</td></tr>
        </table>
        <div class="button-group">
            <button class="button" onclick="finalizeInstallation()">
                <span class="material-icons">check_circle</span>
                Finalize Installation
            </button>
            <button class="button secondary" onclick="navigate('video_object_detection')">
                <span class="material-icons">arrow_back</span>
                Back
            </button>
        </div>
    `,
    main: () => `
        <h1>Meter Dashboard</h1>
        <p>Installation complete. Your system is ready.</p>
        ${membersData ? `
            <table class="details-table">
                <tr><th><span class="material-icons">electric_meter</span>Meter ID</th><td>${membersData.meter_id}</td></tr>
                <tr><th><span class="material-icons">home</span>Household ID</th><td>${membersData.hhid}</td></tr>
            </table>
            <h2>Household Members</h2>
            ${membersData.members.length ? `
                <table class="members-table">
                    <thead><tr><th>Name</th><th>Age</th><th>Gender</th><th>Created</th></tr></thead>
                    <tbody>
                        ${membersData.members.map(m => `
                            <tr>
                                <td><span class="material-icons">person</span> ${m.name}</td>
                                <td>${m.age || 'N/A'}</td>
                                <td>${m.gender || 'N/A'}</td>
                                <td>${new Date(m.created_at).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p style="text-align: center; color: hsl(var(--muted-foreground));">No members found</p>'}
        ` : `
            <div class="loading"><div class="spinner"></div><p>Loading members...</p></div>
        `}
        <div class="separator"></div>
        <div class="button-group">
            <button class="button secondary" onclick="showWiFiPopup()">
                <span class="material-icons">wifi</span> Wi-Fi Settings
            </button>
            <button class="button secondary" onclick="shutdown()">
                <span class="material-icons">power_settings_new</span> Shutdown
            </button>
            <button class="button secondary" onclick="restart()">
                <span class="material-icons">restart_alt</span> Restart
            </button>
        </div>
    `
};

// === UTILS ===
function updateProgressBar() {
    const idx = steps.findIndex(s => s.id === currentState);
    progressBar.innerHTML = steps.map((_, i) => `
        <div class="progress-step ${i <= idx ? 'active' : ''}"></div>
    `).join('');
}

function showError(msg, type = 'error') {
    const el = document.getElementById('error');
    if (el) {
        el.innerHTML = `<span class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</span> ${msg}`;
        el.className = type;
        el.style.display = 'flex';
        if (type === 'success') setTimeout(() => el.style.display = 'none', 3000);
    }
}

function render(details = null) {
    container.innerHTML = states[currentState](details);
    updateProgressBar();
    attachInputListeners();
}

// === WIFI & SYSTEM ===
async function checkWiFi() {
    try {
        const res = await fetch('/api/check_wifi');
        const data = await res.json();
        if (data.success) {
            const cur = await fetch('/api/current_wifi');
            const cdata = await cur.json();
            if (cdata.success) render(cdata.ssid);
            else showWiFiPopup();
        } else showWiFiPopup();
    } catch (e) {
        showError('Wi-Fi check failed');
        render();
    }
}

async function showWiFiPopup() {
    const popup = document.createElement('div');
    popup.id = 'wifi-popup'; popup.className = 'popup';
    const overlay = document.createElement('div');
    overlay.id = 'wifi-overlay'; overlay.className = 'overlay';
    overlay.onclick = closeWiFiPopup;

    popup.innerHTML = `
        <h2><span class="material-icons">wifi</span> Select Wi-Fi</h2>
        <p>Choose a network to connect</p>
        <div id="wifi-error" class="error" style="display: none;"></div>
        <select id="ssid" onchange="togglePasswordField()"><option>Select Network</option></select>
        <input type="password" id="password" placeholder="Password" style="display: none;" onfocus="showKeyboard(this)">
        <div class="button-group">
            <button class="button" onclick="connectWiFi()">Connect</button>
            <button class="button secondary" onclick="disconnectWiFi()">Disconnect</button>
            <button class="button secondary" onclick="closeWiFiPopup()">Close</button>
        </div>
    `;
    document.body.append(overlay, popup);
    await scanWiFi();
}

async function scanWiFi() {
    const select = document.getElementById('ssid');
    const err = document.getElementById('wifi-error');
    try {
        const res = await fetch('/api/wifi/networks');
        const data = await res.json();
        if (data.success) {
            select.innerHTML = '<option>Select Network</option>';
            data.networks.forEach(n => {
                const opt = document.createElement('option');
                opt.value = n.ssid;
                opt.textContent = `${n.ssid} (${n.signal_strength}, ${n.security})`;
                select.appendChild(opt);
            });
        } else {
            err.innerHTML = `<span class="material-icons">error</span> ${data.error}`;
            err.style.display = 'flex';
        }
    } catch (e) {
        err.innerHTML = `<span class="material-icons">error</span> Scan failed`;
        err.style.display = 'flex';
    }
}

function togglePasswordField() {
    document.getElementById('password').style.display = 
        document.getElementById('ssid').value ? 'block' : 'none';
}

async function connectWiFi() {
    const ssid = document.getElementById('ssid').value;
    const pass = document.getElementById('password').value;
    const err = document.getElementById('wifi-error');
    if (!ssid || !pass) return showError('SSID & password required', 'error');

    try {
        const res = await fetch('/api/wifi/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ssid, password: pass })
        });
        const data = await res.json();
        err.className = data.success ? 'success' : 'error';
        err.innerHTML = `<span class="material-icons">${data.success ? 'check_circle' : 'error'}</span> ${data.success ? 'Connected!' : data.error}`;
        err.style.display = 'flex';
        if (data.success) setTimeout(() => { closeWiFiPopup(); navigate('network_test', 'wifi'); }, 2000);
    } catch (e) {
        err.innerHTML = `<span class="material-icons">error</span> Connection failed`;
        err.style.display = 'flex';
    }
}

async function disconnectWiFi() {
    const err = document.getElementById('wifi-error');
    try {
        const res = await fetch('/api/wifi/disconnect', { method: 'POST' });
        const data = await res.json();
        err.className = data.success ? 'success' : 'error';
        err.innerHTML = `<span class="material-icons">${data.success ? 'check_circle' : 'error'}</span> ${data.message || data.error}`;
        err.style.display = 'flex';
        if (data.success) setTimeout(scanWiFi, 2000);
    } catch (e) {
        err.innerHTML = `<span class="material-icons">error</span> Disconnect failed`;
        err.style.display = 'flex';
    }
}

function closeWiFiPopup() {
    ['wifi-popup', 'wifi-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
    render();
}

// === KEYBOARD ===
function showKeyboard(input) {
    activeInput = input;
    const kb = document.createElement('div');
    kb.id = 'keyboard'; kb.className = 'keyboard';
    // kb.innerHTML = `...`; // (same keyboard HTML as before)
    document.body.appendChild(kb);
}

function typeKey(key) { /* same as before */ }
function toggleCase() { /* same */ }
function toggleSymbols() { /* same */ }
function closeKeyboard() { /* same */ }
function attachInputListeners() { /* same */ }

// === NAVIGATION & FLOW ===
async function navigate(state, param = null) {
    currentState = state;

    if (state === 'network_test') {
        render();
        connectivityMode = param;
        try {
            const res = await fetch('/api/network_test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: param })
            });
            const data = await res.json();
            render(data.success ? 'success' : 'error');
        } catch (e) { render('error'); }
        return;
    }

    if (state === 'input_source_detection') {
        try {
            const res = await fetch('/api/input_sources');
            const data = await res.json();
            inputSources = data.success ? data.sources : [];
            render();
        } catch (e) { inputSources = []; render(); showError('Input detection failed'); }
        return;
    }

    if (state === 'video_object_detection') {
        render();
        try {
            const res = await fetch('/api/video_detection');
            const data = await res.json();
            if (data.success) navigate('finalize');
            else showError('Video detection failed — retry or bypass');
        } catch (e) { showError('Video check failed'); }
        return;
    }

    if (state === 'finalize') {
        try {
            const res = await fetch('/api/installation_details');
            const data = await res.json();
            render(data.success ? data.details : { meter_id: meterId, hhid, connectivity: connectivityMode, input_sources: inputSources, video_detection: false });
        } catch (e) { render({ meter_id: meterId, hhid, connectivity: connectivityMode, input_sources: inputSources, video_detection: false }); }
        return;
    }

    if (state === 'main') await fetchMembers();
    render();
}

async function bypassVideoDetection() { navigate('finalize'); }

// === API CALLS ===
async function submitHHID() {
    hhid = document.getElementById('hhid').value.trim();
    if (!hhid) return showError('Enter HHID');

    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons">hourglass_top</span> Sending...';

    try {
        const res = await fetch('/api/submit_hhid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                meter_id: meterId,  // ADD THIS
                hhid: hhid
            })
        });
        const data = await res.json();
        if (data.success) {
            showError('OTP sent! Check email.', 'success');
            setTimeout(() => navigate('otp_verification'), 1500);
        } else showError(data.error || 'Invalid HHID');
    } catch (e) {
        showError('Network error. Check internet.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons">send</span> Submit & Send OTP';
    }
}

async function submitOTP() {
    const otp = document.getElementById('otp').value.trim();
    if (!otp || otp.length !== 4) return showError('Enter 4-digit OTP');

    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons">hourglass_top</span> Verifying...';

    try {
        const res = await fetch('/api/submit_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                meter_id: meterId,
                hhid: hhid,      // ← SEND THIS
                otp: otp
            })
        });
        const data = await res.json();
        if (data.success) {
            navigate('input_source_detection');
        } else showError(data.error || 'Invalid OTP');
    } catch (e) {
        showError('Network error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons">verified</span> Verify OTP';
    }
}

async function finalizeInstallation() {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons">hourglass_top</span> Finalizing...';

    try {
        const res = await fetch('/api/finalize', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            membersData = data.data;
            navigate('main');
        } else showError(data.error);
    } catch (e) {
        showError('Failed to finalize');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons">check_circle</span> Finalize Installation';
    }
}

async function fetchMembers() {
    try {
        const res = await fetch('/api/members');
        const data = await res.json();
        if (data.success) membersData = data.data;
    } catch (e) { console.error(e); }
}

// === SYSTEM ===
async function shutdown() {
    if (!confirm('Shutdown system?')) return;
    try {
        const res = await fetch('/api/shutdown', { method: 'POST' });
        const data = await res.json();
        alert(data.success ? 'Shutting down...' : data.error);
    } catch (e) { alert('Shutdown failed'); }
}

async function restart() {
    if (!confirm('Restart system?')) return;
    try {
        const res = await fetch('/api/restart', { method: 'POST' });
        const data = await res.json();
        alert(data.success ? 'Restarting...' : data.error);
    } catch (e) { alert('Restart failed'); }
}

// === INIT ===
async function init() {
    try {
        const res = await fetch('/api/check_installation');
        const data = await res.json();
        meterId = data.meter_id;
        currentState = data.installed ? 'main' : 'welcome';
        if (data.installed) await fetchMembers();
        render();
    } catch (e) {
        currentState = 'welcome';
        render();
    }
}

init();