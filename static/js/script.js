const container = document.getElementById('main-content');
const progressBar = document.getElementById('progress-bar');
let currentState = 'loading';
let meterId = '';
let hhid = '';
let connectivityMode = '';
let inputSources = [];
let membersData = null;
let activeInput = null;

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
        <input type="text" id="hhid" placeholder="Enter Household ID" onfocus="showKeyboard(this)">
        <div class="button-group">
            <button class="button" onclick="submitHHID()">
                <span class="material-icons">send</span>
                Submit
            </button>
            <button class="button secondary" onclick="navigate('display_meter')">
                <span class="material-icons">arrow_back</span>
                Back
            </button>
        </div>
    `,
    otp_verification: () => `
        <h1>Enter OTP</h1>
        <p>Please enter the one-time password sent to you</p>
        <div id="error" class="error" style="display: none;"></div>
        <input type="text" id="otp" placeholder="Enter OTP" maxlength="6" onfocus="showKeyboard(this)">
        <div class="button-group">
            <button class="button" onclick="submitOTP()">
                <span class="material-icons">verified</span>
                Verify
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
            ${inputSources.length ? inputSources.map(source => `
                <li>
                    <span class="material-icons">input</span>
                    ${source}
                </li>
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
            <tr>
                <th><span class="material-icons" style="vertical-align: middle; font-size: 1rem; margin-right: 0.5rem;">electric_meter</span>Meter ID</th>
                <td>${details.meter_id}</td>
            </tr>
            <tr>
                <th><span class="material-icons" style="vertical-align: middle; font-size: 1rem; margin-right: 0.5rem;">home</span>Household ID</th>
                <td>${details.hhid || 'Not set'}</td>
            </tr>
            <tr>
                <th><span class="material-icons" style="vertical-align: middle; font-size: 1rem; margin-right: 0.5rem;">signal_cellular_alt</span>Connectivity</th>
                <td>${details.connectivity.toUpperCase()}</td>
            </tr>
            <tr>
                <th><span class="material-icons" style="vertical-align: middle; font-size: 1rem; margin-right: 0.5rem;">input</span>Input Sources</th>
                <td>${details.input_sources.length ? details.input_sources.join(', ') : 'None'}</td>
            </tr>
            <tr>
                <th><span class="material-icons" style="vertical-align: middle; font-size: 1rem; margin-right: 0.5rem;">videocam</span>Video Detection</th>
                <td>${details.video_detection ? '✓ Working' : '✗ Not working'}</td>
            </tr>
        </table>
        <div class="button-group">
            <button class="button" onclick="finalizeInstallation()">
                <span class="material-icons">check_circle</span>
                Finalize
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
                <tr>
                    <th><span class="material-icons" style="vertical-align: middle; font-size: 1rem; margin-right: 0.5rem;">electric_meter</span>Meter ID</th>
                    <td>${membersData.meterid}</td>
                </tr>
                <tr>
                    <th><span class="material-icons" style="vertical-align: middle; font-size: 1rem; margin-right: 0.5rem;">home</span>Household ID</th>
                    <td>${membersData.hhid || 'Not set'}</td>
                </tr>
            </table>
            <h2>Household Members</h2>
            ${membersData.members.length ? `
                <table class="members-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Age</th>
                            <th>Gender</th>
                            <th>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${membersData.members.map(member => `
                            <tr>
                                <td><span class="material-icons" style="vertical-align: middle; font-size: 1rem; margin-right: 0.25rem; color: hsl(var(--primary));">person</span>${member.name}</td>
                                <td>${member.age || 'N/A'}</td>
                                <td>${member.gender || 'N/A'}</td>
                                <td>${member.created_at}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p style="text-align: center; color: hsl(var(--muted-foreground));">No members available</p>'}
        ` : `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading members data...</p>
            </div>
        `}
        <div class="separator"></div>
        <div class="button-group">
            <button class="button secondary" onclick="showWiFiPopup()">
                <span class="material-icons">wifi</span>
                Wi-Fi Settings
            </button>
            <button class="button secondary" onclick="shutdown()">
                <span class="material-icons">power_settings_new</span>
                Shutdown
            </button>
            <button class="button secondary" onclick="restart()">
                <span class="material-icons">restart_alt</span>
                Restart
            </button>
        </div>
    `
};

function updateProgressBar() {
    const currentStepIndex = steps.findIndex(step => step.id === currentState);
    progressBar.innerHTML = steps.map((step, index) => `
        <div class="progress-step ${index <= currentStepIndex ? 'active' : ''}">
        </div>
    `).join('');
}

async function fetchMembers() {
    try {
        const response = await fetch('/api/members');
        const data = await response.json();
        if (data.success) {
            membersData = data.data;
            console.log('Fetched members data:', membersData);
        } else {
            console.error('Failed to fetch members:', data.error);
            membersData = null;
        }
    } catch (error) {
        console.error('Error fetching members:', error);
        membersData = null;
    }
}

function render(details = null) {
    container.innerHTML = states[currentState](details);
    updateProgressBar();
    attachInputListeners();
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
        errorDiv.innerHTML = `<span class="material-icons">error</span>${message}`;
        errorDiv.style.display = 'flex';
    }
}

async function checkWiFi() {
    try {
        const response = await fetch('/api/check_wifi');
        const data = await response.json();
        console.log('Check Wi-Fi response:', data);
        if (data.success) {
            const currentResponse = await fetch('/api/current_wifi');
            const currentData = await currentResponse.json();
            console.log('Current Wi-Fi response:', currentData);
            if (currentData.success) {
                render(currentData.ssid);
            } else {
                showWiFiPopup();
            }
        } else {
            showWiFiPopup();
        }
    } catch (error) {
        console.error('Error checking Wi-Fi:', error);
        render();
        showError('Error checking Wi-Fi network');
    }
}

async function showWiFiPopup() {
    const popup = document.createElement('div');
    popup.id = 'wifi-popup';
    popup.className = 'popup';
    const overlay = document.createElement('div');
    overlay.id = 'wifi-overlay';
    overlay.className = 'overlay';
    overlay.onclick = closeWiFiPopup;

    popup.innerHTML = `
        <h2 style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="material-icons">wifi</span>
            Select Wi-Fi Network
        </h2>
        <p style="margin-top: 0.5rem;">Choose a network to connect</p>
        <div id="wifi-error" class="error" style="display: none;"></div>
        <select id="ssid" onchange="togglePasswordField()">
            <option value="">Select Wi-Fi Network</option>
        </select>
        <input type="password" id="password" placeholder="Password" style="display: none;" onfocus="showKeyboard(this)">
        <div class="button-group">
            <button class="button" onclick="connectWiFi()">
                <span class="material-icons">link</span>
                Connect
            </button>
            <button class="button secondary" onclick="disconnectWiFi()">
                <span class="material-icons">link_off</span>
                Disconnect
            </button>
            <button class="button secondary" onclick="closeWiFiPopup()">
                <span class="material-icons">close</span>
                Close
            </button>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    await scanWiFi();
}

async function scanWiFi() {
    try {
        const response = await fetch('/api/wifi/networks');
        const data = await response.json();
        console.log('WiFi networks response:', data);
        const ssidSelect = document.getElementById('ssid');
        const errorDiv = document.getElementById('wifi-error');
        if (data.success) {
            ssidSelect.innerHTML = '<option value="">Select Wi-Fi Network</option>';
            data.networks.forEach(network => {
                const option = document.createElement('option');
                option.value = network.ssid;
                option.textContent = `${network.ssid} (${network.signal_strength}, ${network.security})`;
                ssidSelect.appendChild(option);
            });
        } else {
            errorDiv.innerHTML = `<span class="material-icons">error</span>${data.error || 'Failed to scan networks'}`;
            errorDiv.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error scanning Wi-Fi:', error);
        const errorDiv = document.getElementById('wifi-error');
        errorDiv.innerHTML = '<span class="material-icons">error</span>Error scanning Wi-Fi networks';
        errorDiv.style.display = 'flex';
    }
}

function togglePasswordField() {
    const ssid = document.getElementById('ssid').value;
    const passwordField = document.getElementById('password');
    passwordField.style.display = ssid ? 'block' : 'none';
}

async function connectWiFi() {
    const ssid = document.getElementById('ssid').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('wifi-error');

    if (!ssid) {
        errorDiv.innerHTML = '<span class="material-icons">error</span>Please select a Wi-Fi network';
        errorDiv.style.display = 'flex';
        return;
    }
    if (!password) {
        errorDiv.innerHTML = '<span class="material-icons">error</span>Password is required';
        errorDiv.style.display = 'flex';
        return;
    }

    try {
        const response = await fetch('/api/wifi/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ssid, password })
        });
        const data = await response.json();
        console.log('WiFi connect response:', data);
        errorDiv.className = data.success ? 'success' : 'error';
        errorDiv.innerHTML = `<span class="material-icons">${data.success ? 'check_circle' : 'error'}</span>${data.success ? 'Connected successfully' : data.error || 'Connection failed'}`;
        errorDiv.style.display = 'flex';
        if (data.success) {
            setTimeout(() => {
                closeWiFiPopup();
                if (currentState === 'connect_select') {
                    connectivityMode = 'wifi';
                    navigate('network_test', 'wifi');
                }
            }, 2000);
        }
    } catch (error) {
        console.error('Error connecting Wi-Fi:', error);
        errorDiv.innerHTML = '<span class="material-icons">error</span>Error connecting to Wi-Fi';
        errorDiv.style.display = 'flex';
    }
}

async function disconnectWiFi() {
    try {
        const response = await fetch('/api/wifi/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        console.log('WiFi disconnect response:', data);
        const errorDiv = document.getElementById('wifi-error');
        errorDiv.className = data.success ? 'success' : 'error';
        errorDiv.innerHTML = `<span class="material-icons">${data.success ? 'check_circle' : 'error'}</span>${data.success ? data.message : data.error || 'Disconnection failed'}`;
        errorDiv.style.display = 'flex';
        if (data.success) {
            setTimeout(() => {
                errorDiv.className = 'error';
                errorDiv.style.display = 'none';
                scanWiFi();
            }, 2000);
        }
    } catch (error) {
        console.error('Error disconnecting Wi-Fi:', error);
        const errorDiv = document.getElementById('wifi-error');
        errorDiv.innerHTML = '<span class="material-icons">error</span>Error disconnecting Wi-Fi';
        errorDiv.style.display = 'flex';
    }
}

function closeWiFiPopup() {
    const popup = document.getElementById('wifi-popup');
    const overlay = document.getElementById('wifi-overlay');
    if (popup) popup.remove();
    if (overlay) overlay.remove();
    render();
}

function showKeyboard(input) {
    activeInput = input;
    const existingKeyboard = document.getElementById('keyboard');
    if (existingKeyboard) existingKeyboard.remove();

    const keyboard = document.createElement('div');
    keyboard.id = 'keyboard';
    keyboard.className = 'keyboard';
    keyboard.innerHTML = `
        <div class="keyboard-row">
            <button class="keyboard-key" onclick="typeKey('1')">1</button>
            <button class="keyboard-key" onclick="typeKey('2')">2</button>
            <button class="keyboard-key" onclick="typeKey('3')">3</button>
            <button class="keyboard-key" onclick="typeKey('4')">4</button>
            <button class="keyboard-key" onclick="typeKey('5')">5</button>
            <button class="keyboard-key" onclick="typeKey('6')">6</button>
            <button class="keyboard-key" onclick="typeKey('7')">7</button>
            <button class="keyboard-key" onclick="typeKey('8')">8</button>
            <button class="keyboard-key" onclick="typeKey('9')">9</button>
            <button class="keyboard-key" onclick="typeKey('0')">0</button>
            <button class="keyboard-key" onclick="typeKey('-')">-</button>
            <button class="keyboard-key" onclick="typeKey('=')">=</button>
        </div>
        <div class="keyboard-row">
            <button class="keyboard-key" onclick="typeKey('q')">q</button>
            <button class="keyboard-key" onclick="typeKey('w')">w</button>
            <button class="keyboard-key" onclick="typeKey('e')">e</button>
            <button class="keyboard-key" onclick="typeKey('r')">r</button>
            <button class="keyboard-key" onclick="typeKey('t')">t</button>
            <button class="keyboard-key" onclick="typeKey('y')">y</button>
            <button class="keyboard-key" onclick="typeKey('u')">u</button>
            <button class="keyboard-key" onclick="typeKey('i')">i</button>
            <button class="keyboard-key" onclick="typeKey('o')">o</button>
            <button class="keyboard-key" onclick="typeKey('p')">p</button>
            <button class="keyboard-key" onclick="typeKey('[')">[</button>
            <button class="keyboard-key" onclick="typeKey(']')">]</button>
        </div>
        <div class="keyboard-row">
            <button class="keyboard-key" onclick="typeKey('a')">a</button>
            <button class="keyboard-key" onclick="typeKey('s')">s</button>
            <button class="keyboard-key" onclick="typeKey('d')">d</button>
            <button class="keyboard-key" onclick="typeKey('f')">f</button>
            <button class="keyboard-key" onclick="typeKey('g')">g</button>
            <button class="keyboard-key" onclick="typeKey('h')">h</button>
            <button class="keyboard-key" onclick="typeKey('j')">j</button>
            <button class="keyboard-key" onclick="typeKey('k')">k</button>
            <button class="keyboard-key" onclick="typeKey('l')">l</button>
            <button class="keyboard-key" onclick="typeKey(';')">;</button>
            <button class="keyboard-key" onclick="typeKey('\'')">'</button>
        </div>
        <div class="keyboard-row">
            <button class="keyboard-key shift" onclick="toggleCase()">Shift</button>
            <button class="keyboard-key" onclick="typeKey('z')">z</button>
            <button class="keyboard-key" onclick="typeKey('x')">x</button>
            <button class="keyboard-key" onclick="typeKey('c')">c</button>
            <button class="keyboard-key" onclick="typeKey('v')">v</button>
            <button class="keyboard-key" onclick="typeKey('b')">b</button>
            <button class="keyboard-key" onclick="typeKey('n')">n</button>
            <button class="keyboard-key" onclick="typeKey('m')">m</button>
            <button class="keyboard-key" onclick="typeKey(',')">,</button>
            <button class="keyboard-key" onclick="typeKey('.')">.</button>
            <button class="keyboard-key" onclick="typeKey('/')">/</button>
        </div>
        <div class="keyboard-row">
            <button class="keyboard-key symbol" onclick="toggleSymbols()">Symbols</button>
            <button class="keyboard-key space" onclick="typeKey(' ')">Space</button>
            <button class="keyboard-key backspace" onclick="typeKey('backspace')">
                <span class="material-icons">backspace</span>
            </button>
            <button class="keyboard-key close" onclick="closeKeyboard()">
                <span class="material-icons">close</span>
            </button>
        </div>
        <div class="keyboard-row symbols" style="display: none;">
            <button class="keyboard-key" onclick="typeKey('!')">!</button>
            <button class="keyboard-key" onclick="typeKey('@')">@</button>
            <button class="keyboard-key" onclick="typeKey('#')">#</button>
            <button class="keyboard-key" onclick="typeKey('$')">$</button>
            <button class="keyboard-key" onclick="typeKey('%')">%</button>
            <button class="keyboard-key" onclick="typeKey('^')">^</button>
            <button class="keyboard-key" onclick="typeKey('&')">&</button>
            <button class="keyboard-key" onclick="typeKey('*')">*</button>
            <button class="keyboard-key" onclick="typeKey('(')">(</button>
            <button class="keyboard-key" onclick="typeKey(')')">)</button>
            <button class="keyboard-key" onclick="typeKey('_')">_</button>
            <button class="keyboard-key" onclick="typeKey('+')">+</button>
        </div>
    `;

    document.body.appendChild(keyboard);
}

function typeKey(key) {
    if (!activeInput) return;
    if (key === 'backspace') {
        activeInput.value = activeInput.value.slice(0, -1);
    } else if (key === 'space') {
        activeInput.value += ' ';
    } else {
        const isUpperCase = document.querySelector('.shift.active') !== null;
        activeInput.value += isUpperCase && /[a-z]/.test(key) ? key.toUpperCase() : key;
    }
    activeInput.focus();
}

function toggleCase() {
    const shiftBtn = document.querySelector('.shift');
    shiftBtn.classList.toggle('active');
}

function toggleSymbols() {
    const symbolsRow = document.querySelector('.symbols');
    symbolsRow.style.display = symbolsRow.style.display === 'none' ? 'flex' : 'none';
}

function closeKeyboard() {
    const keyboard = document.getElementById('keyboard');
    if (keyboard) keyboard.remove();
    activeInput = null;
}

function attachInputListeners() {
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('focus', () => showKeyboard(input));
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('input') && !e.target.closest('.keyboard') && !e.target.closest('#wifi-popup')) {
            closeKeyboard();
        }
    });
}

async function navigate(state, param = null) {
    currentState = state;
    if (state === 'network_test') {
        render();
        try {
            connectivityMode = param;
            const response = await fetch('/api/network_test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: param })
            });
            const data = await response.json();
            console.log('Network test response:', data);
            render(data.success ? 'success' : 'error');
        } catch (error) {
            console.error('Error in network test:', error);
            render('error');
        }
        return;
    } else if (state === 'input_source_detection') {
        try {
            const response = await fetch('/api/input_sources');
            const data = await response.json();
            console.log('Input sources response:', data);
            if (data.success) {
                inputSources = data.sources;
                render();
            } else {
                inputSources = [];
                render();
                showError(data.error || 'Failed to detect input sources');
            }
        } catch (error) {
            console.error('Error fetching input sources:', error);
            inputSources = [];
            render();
            showError('Error fetching input sources');
        }
        return;
    } else if (state === 'video_object_detection') {
        render();
        try {
            const response = await fetch('/api/video_detection');
            const data = await response.json();
            console.log('Video detection response:', data);
            if (data.success) {
                navigate('finalize');
            } else {
                container.innerHTML = `
                    <h1>Video Detection</h1>
                    <p>Testing video object detection capabilities</p>
                    <div class="error" style="display: flex;">
                        <span class="material-icons">error</span>
                        Detection failed: ${data.error || 'Unknown error'}
                    </div>
                    <div class="button-group">
                        <button class="button" onclick="navigate('video_object_detection')">
                            <span class="material-icons">refresh</span>
                            Retry
                        </button>
                        <button class="button secondary" onclick="bypassVideoDetection()">
                            <span class="material-icons">skip_next</span>
                            Bypass
                        </button>
                    </div>
                `;
                updateProgressBar();
            }
        } catch (error) {
            console.error('Error in video detection:', error);
            container.innerHTML = `
                <h1>Video Detection</h1>
                <p>Testing video object detection capabilities</p>
                <div class="error" style="display: flex;">
                    <span class="material-icons">error</span>
                    Error checking video detection
                </div>
                <div class="button-group">
                    <button class="button" onclick="navigate('video_object_detection')">
                        <span class="material-icons">refresh</span>
                        Retry
                    </button>
                    <button class="button secondary" onclick="bypassVideoDetection()">
                        <span class="material-icons">skip_next</span>
                        Bypass
                    </button>
                </div>
            `;
            updateProgressBar();
        }
        return;
    } else if (state === 'finalize') {
        try {
            const response = await fetch('/api/installation_details');
            const data = await response.json();
            console.log('Installation details response:', data);
            if (data.success) {
                render(data.details);
            } else {
                render({ meter_id: meterId, hhid: hhid, connectivity: connectivityMode, input_sources: inputSources, video_detection: false });
                showError(data.error || 'Failed to fetch installation details');
            }
            return;
        } catch (error) {
            console.error('Error fetching installation details:', error);
            render({ meter_id: meterId, hhid: hhid, connectivity: connectivityMode, input_sources: inputSources, video_detection: false });
            showError('Error fetching installation details');
            return;
        }
    } else if (state === 'main') {
        await fetchMembers();
    }
    render();
}

async function bypassVideoDetection() {
    console.log('Bypassing video detection');
    navigate('finalize');
}

async function finalizeInstallation() {
    try {
        const response = await fetch('/api/finalize', { method: 'POST' });
        const data = await response.json();
        console.log('Finalize response:', data);
        if (data.success) {
            navigate('main');
        } else {
            showError(data.error || 'Failed to finalize installation');
        }
    } catch (error) {
        console.error('Error finalizing:', error);
        showError('Error finalizing installation');
    }
}

async function shutdown() {
    if (!confirm('Are you sure you want to shutdown the system?')) return;
    try {
        const response = await fetch('/api/shutdown', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        console.log('Shutdown response:', data);
        alert(data.success ? data.message : data.error || 'Shutdown failed');
    } catch (error) {
        console.error('Error shutting down:', error);
        alert('Error shutting down');
    }
}

async function restart() {
    if (!confirm('Are you sure you want to restart the system?')) return;
    try {
        const response = await fetch('/api/restart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        console.log('Restart response:', data);
        alert(data.success ? data.message : data.error || 'Restart failed');
    } catch (error) {
        console.error('Error restarting:', error);
        alert('Error restarting');
    }
}

async function submitHHID() {
    hhid = document.getElementById('hhid').value;
    if (!hhid) {
        showError('Household ID is required');
        return;
    }
    try {
        const response = await fetch('/api/submit_hhid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hhid })
        });
        const data = await response.json();
        console.log('Submit HHID response:', data);
        if (data.success) {
            navigate('otp_verification');
        } else {
            showError(data.error || 'Invalid Household ID');
        }
    } catch (error) {
        console.error('Error submitting HHID:', error);
        showError('Error submitting Household ID');
    }
}

async function submitOTP() {
    const otp = document.getElementById('otp').value;
    if (!otp) {
        showError('OTP is required');
        return;
    }
    try {
        const response = await fetch('/api/submit_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp, hhid })
        });
        const data = await response.json();
        console.log('Submit OTP response:', data);
        if (data.success) {
            navigate('input_source_detection');
        } else {
            showError(data.error || 'Invalid OTP');
        }
    } catch (error) {
        console.error('Error submitting OTP:', error);
        showError('Error submitting OTP');
    }
}

async function init() {
    try {
        const response = await fetch('/api/check_installation');
        const data = await response.json();
        console.log('Check installation response:', data);
        meterId = data.meter_id;
        currentState = data.installed ? 'main' : 'welcome';
        if (data.installed) {
            await fetchMembers();
        }
        render();
    } catch (error) {
        console.error('Error initializing:', error);
        currentState = 'welcome';
        render();
    }
}

init();