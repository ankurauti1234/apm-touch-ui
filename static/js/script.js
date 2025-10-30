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
    let shiftActive = false;

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

    // === KEYBOARD LAYOUTS ===
    const keyboardLayouts = {
        normal: [
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
            ['z', 'x', 'c', 'v', 'b', 'n', 'm']
        ],
        shift: [
            ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
        ]
    };

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
            <div class="loading" id="input-loading">
                <div class="spinner"></div>
                <p>Detecting inputs...</p>
            </div>
            <div id="input-results" style="display: none;">
                <ul>
                    ${inputSources.length ? inputSources.map(s => `
                        <li><span class="material-icons">input</span> ${s}</li>
                    `).join('') : '<li><span class="material-icons">info</span> No sources detected</li>'}
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
            </div>
        `,
        video_object_detection: () => `
            <h1>Video Detection</h1>
            <p>Checking video object detection capabilities</p>
            <div class="loading" id="video-loading">
                <div class="spinner"></div>
                <p>Running detection test...</p>
            </div>
            <div id="video-results" style="display: none;">
                <div id="video-status"></div>
                <div class="button-group">
                    <button class="button" onclick="navigate('finalize')">
                        <span class="material-icons">arrow_forward</span>
                        Next
                    </button>
                    <button class="button secondary" onclick="navigate('input_source_detection')">
                        <span class="material-icons">arrow_back</span>
                        Back
                    </button>
                </div>
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
        main: () => {
            const maxMembers = 8;
            const members = membersData?.members || [];
            const shown = members.slice(0, maxMembers);
            const empty = maxMembers - shown.length;

            const getAvatar = (gender, age) => {
                if (!gender || !age) return '/static/assets/default.png';
                const g = gender.toLowerCase();
                let cat = 'middle';
                if (age <= 12) cat = 'kid';
                else if (age <= 19) cat = 'teen';
                else if (age <= 40) cat = 'middle';
                else if (age <= 60) cat = 'aged';
                else cat = 'elder';
                return `/static/assets/${g}-${cat}.png`;
            };

            return `
                <div class="main-dashboard">
                    <div class="members-grid">
                        ${shown.map((m, i) => {
                            const img = getAvatar(m.gender, m.age);
                            return `
                                <div class="member-card-grid ${m.active === false ? 'inactive' : 'active'}"
                                     onclick="toggleMember(${i})"
                                     style="--bg-image: url('${img}')">
                                    <div class="name-tag">${m.name || 'Unknown'}</div>
                                </div>
                            `;
                        }).join('')}

                        ${Array(empty).fill().map(() => `
                            <div class="member-card-grid empty">
                                <div class="name-tag">—</div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="bottom-bar">
                        <button class="bar-btn" onclick="showWiFiPopup()">
                            <span class="material-icons">wifi</span>
                            <span>Wi-Fi</span>
                        </button>
                        <button class="bar-btn" onclick="restart()">
                            <span class="material-icons">restart_alt</span>
                            <span>Reboot</span>
                        </button>
                        <button class="bar-btn" onclick="shutdown()">
                            <span class="material-icons">power_settings_new</span>
                            <span>Shutdown</span>
                        </button>
                    </div>
                </div>
            `;
        }
    };

    // === KEYBOARD FUNCTIONS (unchanged) ===
    function showKeyboard(inputElement) { /* ... same as before ... */ }
    function renderKeys() { /* ... */ }
    function toggleShift() { /* ... */ }
    function insertChar(char) { /* ... */ }
    function backspace() { /* ... */ }
    function pressEnter() { /* ... */ }
    function hideKeyboard() { /* ... */ }
    function scrollInputIntoView() { /* ... */ }

    document.addEventListener('click', (e) => {
        const keyboard = document.getElementById('virtual-keyboard');
        const targetInput = e.target.closest('input[type="text"], input[type="password"]');
        if (keyboard && !e.target.closest('.virtual-keyboard')) {
            if (targetInput) {
                activeInput = targetInput;
                renderKeys();
                scrollInputIntoView();
            } else {
                hideKeyboard();
            }
        }
    });

    // === RENDER FUNCTION ===
    function render(details = null) {
        const html = states[currentState](details);
        if (currentState === 'main') {
            container.innerHTML = html;
            progressBar.style.display = 'none';
            setTimeout(() => {
                document.querySelectorAll('.member-card-grid').forEach(card => {
                    const bg = card.style.getPropertyValue('--bg-image') || '';
                    if (bg) card.style.setProperty('--card-bg', bg);
                });
            }, 10);
        } else {
            container.innerHTML = `
                <div class="container">
                    <div class="card">
                        <div id="progress-bar-temp"></div>
                        ${html}
                    </div>
                </div>`;
            const temp = container.querySelector('#progress-bar-temp');
            if (temp && progressBar) {
                temp.parentNode.insertBefore(progressBar, temp);
                temp.remove();
                progressBar.style.display = 'flex';
                updateProgressBar();
            }
        }
    }

    // === PROGRESS BAR ===
    function updateProgressBar() {
        if (!progressBar) return;
        const idx = steps.findIndex(s => s.id === currentState);
        progressBar.innerHTML = steps.map((_, i) => `
            <div class="progress-step ${i <= idx ? 'active' : ''}"></div>
        `).join('');
    }

    // === ERROR HANDLING ===
    function showError(msg, type = 'error') {
        const el = document.getElementById('error');
        if (el) {
            el.innerHTML = `<span class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</span> ${msg}`;
            el.className = type;
            el.style.display = 'flex';
            if (type === 'success') setTimeout(() => el.style.display = 'none', 3000);
        }
    }

    // === WIFI POPUP ===
    async function showWiFiPopup() {
        closeWiFiPopup();
        const popup = document.createElement('div');
        popup.id = 'wifi-popup';
        popup.className = 'popup';
        const overlay = document.createElement('div');
        overlay.id = 'wifi-overlay';
        overlay.className = 'overlay';
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
        if (!select || !err) return;
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
        const passwordField = document.getElementById('password');
        const ssid = document.getElementById('ssid');
        if (passwordField && ssid) {
            passwordField.style.display = ssid.value ? 'block' : 'none';
        }
    }

    async function connectWiFi() {
        const ssid = document.getElementById('ssid')?.value;
        const pass = document.getElementById('password')?.value;
        const err = document.getElementById('wifi-error');
        if (!err) return;
        if (!ssid || !pass) {
            err.innerHTML = '<span class="material-icons">error</span> SSID & password required';
            err.className = 'error';
            err.style.display = 'flex';
            return;
        }

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
            if (data.success) {
                setTimeout(async () => {
                    closeWiFiPopup();
                    const cur = await fetch('/api/current_wifi');
                    const cdata = await cur.json();
                    if (cdata.success) navigate('connect_select', cdata.ssid);
                }, 2000);
            }
        } catch (e) {
            err.innerHTML = `<span class="material-icons">error</span> Connection failed`;
            err.style.display = 'flex';
        }
    }

    async function disconnectWiFi() {
        const err = document.getElementById('wifi-error');
        if (!err) return;
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

    // === NAVIGATION WITH API CALLS ===
    async function navigate(state, param = null) {
        currentState = state;

        if (state === 'connect_select') {
            const cur = await fetch('/api/current_wifi');
            const cdata = await cur.json();
            render(cdata.success ? cdata.ssid : null);
            return;
        }

        if (state === 'network_test') {
            connectivityMode = param;
            render();
            setTimeout(async () => {
                const res = await fetch('/api/check_wifi');
                const data = await res.json();
                render(data.success ? 'success' : 'error');
            }, 1500);
            return;
        }

        if (state === 'input_source_detection') {
            render();
            setTimeout(fetchInputSources, 1000);
            return;
        }

        if (state === 'video_object_detection') {
            render();
            setTimeout(checkVideoDetection, 1500);
            return;
        }

        if (state === 'finalize') {
            const details = {
                meter_id: meterId,
                hhid,
                connectivity: connectivityMode.toUpperCase(),
                input_sources: inputSources,
                video_detection: !!document.getElementById('video-status')?.dataset.detected
            };
            render(details);
            return;
        }

        if (state === 'main') await fetchMembers();
        render();
    }

    // === API: Input Sources ===
    async function fetchInputSources() {
        const loading = document.getElementById('input-loading');
        const results = document.getElementById('input-results');
        try {
            const res = await fetch('/api/input_sources');
            const data = await res.json();
            if (data.success && data.sources.length > 0) {
                inputSources = data.sources;
            } else {
                inputSources = [];
                if (data.error) showError(data.error);
            }
        } catch (e) {
            inputSources = [];
            showError('Input detection failed');
        } finally {
            loading.style.display = 'none';
            results.style.display = 'block';
            render(); // Re-render with updated sources
        }
    }

    // === API: Video Detection ===
    async function checkVideoDetection() {
        const loading = document.getElementById('video-loading');
        const results = document.getElementById('video-results');
        const statusEl = document.getElementById('video-status');
        try {
            const res = await fetch('/api/video_detection');
            const data = await res.json();
            if (data.success && data.detected) {
                statusEl.innerHTML = `<div class="success"><span class="material-icons">check_circle</span> Video detection active: ${data.status}</div>`;
                statusEl.dataset.detected = 'true';
            } else {
                statusEl.innerHTML = `<div class="info"><span class="material-icons">info</span> Video detection not running</div>`;
                statusEl.dataset.detected = 'false';
            }
        } catch (e) {
            statusEl.innerHTML = `<div class="error"><span class="material-icons">error</span> Detection failed</div>`;
            statusEl.dataset.detected = 'false';
        } finally {
            loading.style.display = 'none';
            results.style.display = 'block';
        }
    }

    // === API CALLS ===
    async function checkWiFi() {
        try {
            const res = await fetch('/api/check_wifi');
            const data = await res.json();
            if (data.success) {
                const cur = await fetch('/api/current_wifi');
                const cdata = await cur.json();
                if (cdata.success) navigate('connect_select', cdata.ssid);
                else showWiFiPopup();
            } else showWiFiPopup();
        } catch (e) {
            showError('Wi-Fi check failed');
            showWiFiPopup();
        }
    }

    async function submitHHID() { /* unchanged */ }
    async function submitOTP() { /* unchanged */ }
    async function finalizeInstallation() { /* unchanged */ }
    async function fetchMembers() { /* unchanged */ }
    async function toggleMember(index) { /* unchanged */ }
    async function shutdown() { /* unchanged */ }
    async function restart() { /* unchanged */ }

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