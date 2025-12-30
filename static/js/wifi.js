/* ==============================================================
   wifi.js
   Wi-Fi popup, scanning, connection, lift/lower logic
   ============================================================== */

async function showWiFiPopup() {
    closeSettingsPopup();
    closeWiFiPopup();

    const overlay = document.createElement('div');
    overlay.id = 'wifi-overlay';
    overlay.className = 'overlay';

    const popup = document.createElement('div');
    popup.id = 'wifi-popup';
    popup.className = 'popup';

    popup.innerHTML = `
        <h2 style="margin-top: 0;">Select Wi-Fi</h2>
        <p>Choose a network to connect</p>
        <div id="wifi-error" class="error" style="display:none;"></div>

        <div id="custom-select" class="custom-select">
            <div id="selected-network" class="selected-item">
                <span id="fetching">Select Network</span>
                <span class="material-icons arrow">arrow_drop_down</span>
            </div>
            <ul id="network-list" class="dropdown-list" style="display:none;"></ul>
        </div>

        <div class="password-wrapper" id="password-wrapper" style="position:relative;width:100%;max-width:400px;margin:0 auto;">
            <div style="position:relative;display:flex;align-items:center;">
                <input
                    type="password"
                    id="password"
                    placeholder="Password"
                    autocomplete="off"
                    style="width:100%;padding:12px 48px 12px 12px;border:1px solid #ccc;border-radius:8px;font-size:16px;outline:none;"
                >
                <button type="button" class="toggle-password" onclick="togglePasswordVisibility(event)"
                    style="position:absolute;right:8px;background:none;border:none;cursor:pointer;padding:8px;color:#666;">
                    <span class="material-icons" id="eye-icon" style="font-size:24px;">visibility</span>
                </button>
            </div>

            <div id="wifi-loading" style="display:none;text-align:center;margin-top:12px;">
                <div class="spinner" style="border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;width:32px;height:32px;animation:spin 1s linear infinite;margin:0 auto 8px;"></div>
                <div>Connecting...</div>
            </div>

            <div class="button-group" style="margin-top:20px;display:flex;gap:10px;justify-content:center;">
                <button class="button" onclick="connectWiFi()">Connect</button>
                <button class="button secondary" onclick="disconnectWiFi()">Disconnect</button>
                <button class="button secondary" onclick="closeWiFiPopup()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    // Focus + lift handling for password field
    const passwordInput = document.getElementById('password');
    passwordInput.addEventListener('focus', () => {
        showKeyboard(passwordInput);
        liftWiFiPopup();
    });

    // Lower popup when buttons are clicked
    popup.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('wifi-popup')?.classList.remove('lifted');
        });
    });

    // Start scanning
    document.getElementById('fetching').textContent = 'fetching wifi...';
    await scanWiFi();

    // Auto-open dropdown if networks found
    setTimeout(() => {
        const trigger = document.getElementById('selected-network');
        const list = document.getElementById('network-list');
        if (trigger && list && list.children.length > 0) {
            list.style.display = 'block';
            trigger.classList.add('open');
        }
        document.getElementById('fetching').textContent = 'Select Network';
    }, 20);

    // Dropdown toggle
    document.getElementById('selected-network').onclick = (e) => {
        e.stopPropagation();
        const list = document.getElementById('network-list');
        const isOpen = list.style.display === 'block';
        list.style.display = isOpen ? 'none' : 'block';
        e.currentTarget.classList.toggle('open', !isOpen);
    };

    overlay.onclick = (e) => e.stopPropagation();
}

function liftWiFiPopup() {
    const popup = document.getElementById('wifi-popup');
    if (popup && !wifiPopupLifted) {
        popup.classList.add('lifted');
        wifiPopupLifted = true;
    }
}

function lowerWiFiPopup() {
    const popup = document.getElementById('wifi-popup');
    if (popup && wifiPopupLifted) {
        popup.classList.remove('lifted');
        wifiPopupLifted = false;
    }
}

function togglePasswordVisibility(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
        e.stopImmediatePropagation();
    }
    const input = document.getElementById('password');
    const icon = document.getElementById('eye-icon');
    if (!input || !icon) return;

    const wasPassword = input.type === 'password';
    input.type = wasPassword ? 'text' : 'password';
    icon.textContent = wasPassword ? 'visibility_off' : 'visibility';

    // Force stay lifted
    const popup = document.getElementById('wifi-popup');
    if (popup) {
        popup.classList.add('lifted');
        wifiPopupLifted = true;
    }

    if (activeInput !== input) {
        activeInput = input;
        showKeyboard(input);
    }
}

async function scanWiFi() {
    const container = document.getElementById('network-list');
    const selectedDisplay = document.getElementById('selected-network');
    const err = document.getElementById('wifi-error');
    if (!container || !selectedDisplay || !err) return;

    try {
        const r = await fetch('/api/wifi/networks');
        const d = await r.json();

        if (d.success && d.networks.length > 0) {
            availableNetworks = d.networks;
            container.innerHTML = '';
            d.networks.forEach(n => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                        <div>
                            <span>${n.ssid}</span>
                            ${n.saved ? `<span class="badge-saved">Saved</span>` : ''}
                        </div>
                        <span class="signal">${n.signal_strength || ''} ${n.security || ''}</span>
                    </div>
                `;
                li.onclick = (e) => {
                    e.stopPropagation();
                    selectedSSID = n.ssid;
                    selectedDisplay.innerHTML = `
                        <span>${n.ssid} ${n.saved ? '<span class="badge-saved">Saved</span>' : ''}</span>
                        <span class="material-icons arrow">arrow_drop_down</span>
                    `;
                    container.style.display = 'none';
                    selectedDisplay.classList.remove('open');
                    togglePasswordField();

                    const pw = document.getElementById('password');
                    if (n.saved && n.password) {
                        pw.value = n.password;
                        pw.placeholder = '(Saved password)';
                    } else {
                        pw.value = '';
                        pw.placeholder = 'Password';
                    }
                };
                container.appendChild(li);
            });
            err.style.display = 'none';
        } else {
            container.innerHTML = '<li style="padding:12px;text-align:center;color:hsl(var(--muted-foreground));">No networks found</li>';
            err.innerHTML = `<span class="material-icons">error</span> ${d.error || 'No networks'}`;
            err.style.display = 'flex';
        }
    } catch (e) {
        container.innerHTML = '<li style="padding:12px;text-align:center;color:hsl(var(--destructive));">Scan failed</li>';
        err.innerHTML = `<span class="material-icons">error</span> Scan failed`;
        err.style.display = 'flex';
    }
}

function togglePasswordField() {
    const wrapper = document.getElementById('password-wrapper');
    if (wrapper) {
        wrapper.style.display = selectedSSID ? 'block' : 'none';
    }
}

async function connectWiFi() {
    lowerWiFiPopup();
    const loading = document.getElementById('wifi-loading');
    const pass = document.getElementById('password')?.value;
    const err = document.getElementById('wifi-error');

    loading.style.display = 'block';

    if (!selectedSSID || !pass) {
        err.innerHTML = '<span class="material-icons">error</span> Provide SSID & Password';
        err.className = 'error';
        err.style.display = 'flex';
        loading.style.display = 'none';
        return;
    }

    try {
        const r = await fetch('/api/wifi/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ssid: selectedSSID, password: pass })
        });
        const d = await r.json();
        err.className = d.success ? 'success' : 'error';
        err.innerHTML = `<span class="material-icons">${d.success ? 'check_circle' : 'error'}</span> ${d.success ? 'Connected!' : d.error}`;
        err.style.display = 'flex';

        if (d.success) {
            setTimeout(async () => {
                closeWiFiPopup();
                const cur = await fetch('/api/current_wifi');
                const cd = await cur.json();
                if (currentState !== 'main' && cd.success) {
                    if (currentState !== 'connect_select' && cd.success) {
                        return;
                    } else {
                        navigate('connect_select', cd.ssid);
                    }
                }
            }, 2000);
        }
    } catch {
        err.innerHTML = '<span class="material-icons">error</span> Connection failed';
        err.style.display = 'flex';
    } finally {
        loading.style.display = 'none';
        // Immediate update for both UI elements
        if (currentState === 'main') {
            updateMainDashboardWiFiStatus();
        } else {
            updateBottomBarWiFiStatus();
        }
    }
}

async function disconnectWiFi() {
    const err = document.getElementById('wifi-error');
    const loading = document.getElementById('wifi-loading');
    try {
        loading.style.display = 'block';
        const r = await fetch('/api/wifi/disconnect', { method: 'POST' });
        const d = await r.json();
        err.className = d.success ? 'success' : 'error';
        err.innerHTML = `<span class="material-icons">${d.success ? 'check_circle' : 'error'}</span> ${d.message || d.error || 'Disconnected'}`;
        err.style.display = 'flex';
        if (d.success) {
            setTimeout(() => {
                closeWiFiPopup();
                if (currentState !== 'connect_select' && cd.success) {
                    return;
                } else {
                    navigate('connect_select', cd.ssid);
                }
            }, 1200);
        }
    } catch (e) {
        err.innerHTML = '<span class="material-icons">error</span> Disconnect failed';
        err.className = 'error';
        err.style.display = 'flex';
    } finally {
        loading.style.display = 'none';
        // Immediate update for both UI elements
        if (currentState === 'main') {
            updateMainDashboardWiFiStatus();
        } else {
            updateBottomBarWiFiStatus();
        }
    }
}

function closeWiFiPopup() {
    lowerWiFiPopup();
    ['wifi-popup', 'wifi-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
    hideKeyboard();
}

// Spinner animation (add once)
if (!document.getElementById('wifi-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'wifi-spinner-style';
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

/* ==============================================================
    Wi-Fi Status Updating in Main Dashboard and Bottom Bar
    ============================================================== */

    async function updateMainDashboardWiFiStatus() {
        const statusEl = document.getElementById('bar-wifi-status');
        if (!statusEl) return;
    
        try {
            const res = await fetch('/api/current_wifi');
            const data = await res.json();
    
            let icon = 'wifi_off';
            let iconColor = '#000000ff';     // black for disconnected
            let textColor = '#000000ff';     // always black text
            let backgroundColor = '#68757a'; // grey background
            let text = 'Disconnected';
    
            if (data.success && data.ssid) {
                icon = 'wifi';
                iconColor = '#4caf50';       // GREEN only for icon when connected
                backgroundColor = '#1565c0'; // blue background when connected
                text = data.ssid;
            }
    
            statusEl.innerHTML = `
                <button class="bar-btn" id="bar-btn-wifi" style="background-color:${backgroundColor};" onclick="showWiFiPopup()">
                    <span style="color:${textColor}; max-width:350px; overflow:hidden; text-overflow:ellipsis; display:inline-block;">
                        ${text} &nbsp;
                    </span>
                    <span class="material-icons" style="color:${iconColor};">${icon}</span>
                </button>
            `;
        } catch (e) {
            statusEl.innerHTML = `
                <button class="bar-btn" id="bar-btn-wifi" style="background-color:#68757a;" onclick="showWiFiPopup()">
                    <span style="color:#000000ff;">Disconnected &nbsp;</span>
                    <span class="material-icons" style="color:#000000ff;">wifi_off</span>
                </button>
            `;
        }
    }

    async function updateBottomBarWiFiStatus() {
        const bottomBars = document.getElementById("bottom-bar-right");
        if (!bottomBars) return;
    
        let icon = "wifi_off";
        let iconColor = "#070808";      // dark for disconnected
        let textColor = "#070808";      // always dark text
        let text = "Disconnected";
    
        try {
            const res = await fetch("/api/current_wifi");
            if (!res.ok) throw new Error("Network error");
    
            const data = await res.json();
    
            if (data.success && data.ssid) {
                icon = "wifi";
                iconColor = "#4caf50";     // GREEN only for icon
                text = data.ssid;
            }
        } catch (e) {
            console.warn("Wi-Fi status fetch failed:", e);
        }
    
        // Ensure Wi-Fi button exists
        let wifiBtn = document.getElementById("bar-btn-wifi");
    
        if (!wifiBtn) {
            bottomBars.insertAdjacentHTML(
                "beforeend",
                `
                <button class="bar-btn" id="bar-btn-wifi" onclick="showWiFiPopup()">
                    <span class="wifi-text"></span>
                    <span> &nbsp; </span>
                    <span class="material-icons"></span>
                </button>
                `
            );
            wifiBtn = document.getElementById("bar-btn-wifi");
        }
    
        const textEl = wifiBtn.querySelector(".wifi-text");
        const iconEl = wifiBtn.querySelector(".material-icons");
    
        // Text stays dark/black, icon gets special color
        textEl.style.color = textColor;
        iconEl.style.color = iconColor;
    
        textEl.textContent = `${text} `;
        textEl.style.maxWidth = "350px";
        textEl.style.overflow = "hidden";
        textEl.style.textOverflow = "ellipsis";
        textEl.style.whiteSpace = "nowrap";
        textEl.style.display = "inline-block";
    
        iconEl.textContent = icon;
    }


let wifiPollingInterval = null;

function startWiFiStatusPolling() {
    // Clear any existing interval
    if (wifiPollingInterval) clearInterval(wifiPollingInterval);

    // Immediate update for both UI elements
    updateBottomBarWiFiStatus();
    updateMainDashboardWiFiStatus();

    // Then update both every 12 seconds
    wifiPollingInterval = setInterval(() => {
        updateBottomBarWiFiStatus();
        updateMainDashboardWiFiStatus();
    }, 12000); // 12 seconds — adjust if needed (e.g., 10000 for 10s)
}

function stopWiFiStatusPolling() {
    if (wifiPollingInterval) {
        clearInterval(wifiPollingInterval);
        wifiPollingInterval = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    startWiFiStatusPolling();
});



// show Meter ID popup
function showMeterIdPopup() {
    // Use the existing meterId variable
    if (!meterId || meterId.trim() === '') {
        meterId = 'Not Available'; // Fallback if empty
    }

    // Create the popup
    const popup = document.createElement('div');
    popup.className = 'meter-id-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <div class="popup-header">
                <span class="material-icons">memory</span>
                <h3>Meter ID</h3>
            </div>
            <div class="meter-id-display">${meterId}</div>
            <button class="popup-close-btn" onclick="this.closest('.meter-id-popup').remove()">
                <span class="material-icons">close</span>
            </button>
        </div>
    `;

    document.body.appendChild(popup);

    // Close when clicking outside the content
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.remove();
        }
    });
}