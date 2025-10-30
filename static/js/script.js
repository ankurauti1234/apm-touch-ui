/* ==============================================================
   GLOBAL STATE
   ============================================================== */
const container   = document.getElementById('main-content');
const progressBar = document.getElementById('progress-bar');

let currentState   = 'loading';
let meterId        = '';
let hhid           = '';
let connectivityMode = '';
let inputSources   = [];          // filled by /api/input_sources
let membersData    = null;
let activeInput    = null;        // <input> that has focus
let shiftActive    = false;

/* ==============================================================
   STEPS (for progress bar)
   ============================================================== */
const steps = [
    { id: 'welcome',                label: 'Start' },
    { id: 'connect_select',         label: 'Connect' },
    { id: 'network_test',           label: 'Network' },
    { id: 'display_meter',          label: 'Meter ID' },
    { id: 'hhid_input',             label: 'HHID' },
    { id: 'otp_verification',       label: 'OTP' },
    { id: 'input_source_detection', label: 'Inputs' },
    { id: 'video_object_detection', label: 'Video' },
    { id: 'finalize',               label: 'Summary' },
    { id: 'main',                   label: 'Complete' }
];

/* ==============================================================
   KEYBOARD LAYOUTS
   ============================================================== */
const keyboardLayouts = {
    normal: [
        ['1','2','3','4','5','6','7','8','9','0'],
        ['q','w','e','r','t','y','u','i','o','p'],
        ['a','s','d','f','g','h','j','k','l'],
        ['z','x','c','v','b','n','m']
    ],
    shift: [
        ['!','@','#','$','%','^','&','*','(',')'],
        ['Q','W','E','R','T','Y','U','I','O','P'],
        ['A','S','D','F','G','H','J','K','L'],
        ['Z','X','C','V','B','N','M']
    ]
};

/* ==============================================================
   HTML TEMPLATES (states)
   ============================================================== */
const states = {
    loading: () => `
        <div class="loading"><div class="spinner"></div><p>Loading system...</p></div>`,

    welcome: () => `
        <h1>Welcome to Touch Meter</h1>
        <p>Begin the installation process for your meter system.</p>
        <div class="separator"></div>
        <div class="button-group">
            <button class="button" onclick="navigate('connect_select')">
                <span class="material-icons">play_arrow</span> Start Installation
            </button>
        </div>`,

    connect_select: (currentSSID = null) => `
        <h1>Select Connectivity</h1>
        <p>Choose your preferred connection method</p>
        <div id="error" class="error" style="display:none;"></div>
        ${currentSSID ? `
            <div style="padding:1rem;background:hsl(var(--muted));border-radius:var(--radius);margin:1rem 0;">
                <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem;">
                    <span class="material-icons" style="color:hsl(var(--primary));">wifi</span>
                    <strong>Connected to Wi-Fi</strong>
                </div>
                <p style="margin:0;padding-left:2rem;">${currentSSID}</p>
            </div>
            <div class="button-group">
                <button class="button" onclick="navigate('network_test','wifi')">
                    <span class="material-icons">arrow_forward</span> Continue with Wi-Fi
                </button>
                <button class="button secondary" onclick="showWiFiPopup()">
                    <span class="material-icons">settings</span> Change Wi-Fi
                </button>
            </div>
        ` : `
            <div class="button-group">
                <button class="button" onclick="checkWiFi()">
                    <span class="material-icons">wifi</span> Wi-Fi
                </button>
                <button class="button" onclick="navigate('network_test','gsm')">
                    <span class="material-icons">cell_tower</span> GSM
                </button>
            </div>
        `}`,

    network_test: (status = null) => `
        <h1>Network Test</h1>
        <p>Verifying ${connectivityMode.toUpperCase()} connection</p>
        <div id="error" class="error" style="display:none;"></div>
        ${status === 'success' ? `
            <div class="success"><span class="material-icons">check_circle</span> Network test successful!</div>
            <div class="button-group">
                <button class="button" onclick="navigate('display_meter')">
                    <span class="material-icons">arrow_forward</span> Next
                </button>
            </div>
        ` : status === 'error' ? `
            <div class="error" style="display:flex;">
                <span class="material-icons">error</span> Network test failed.
            </div>
            <div class="button-group">
                <button class="button" onclick="navigate('network_test','${connectivityMode}')">
                    <span class="material-icons">refresh</span> Retry
                </button>
                <button class="button secondary" onclick="navigate('connect_select')">
                    <span class="material-icons">arrow_back</span> Back
                </button>
            </div>
        ` : `
            <div class="loading"><div class="spinner"></div><p>Testing connection...</p></div>
        `}`,

    display_meter: () => `
        <h1>Meter ID</h1>
        <p>Your meter identification number</p>
        <div style="padding:1.5rem;background:hsl(var(--muted));border-radius:var(--radius);margin:1.5rem 0;text-align:center;">
            <div style="display:flex;align-items:center;justify-content:center;gap:.5rem;margin-bottom:.5rem;">
                <span class="material-icons" style="color:hsl(var(--primary));font-size:2rem;">electric_meter</span>
            </div>
            <strong style="font-size:1.5rem;color:hsl(var(--foreground));">${meterId}</strong>
        </div>
        <div class="button-group">
            <button class="button" onclick="navigate('hhid_input')">
                <span class="material-icons">arrow_forward</span> Next
            </button>
        </div>`,

    hhid_input: () => `
        <h1>Enter Household ID</h1>
        <p>Please provide your household identification number</p>
        <div id="error" class="error" style="display:none;"></div>
        <input type="text" id="hhid" placeholder="Enter HHID (e.g. HH1002)" onfocus="showKeyboard(this)">
        <div class="button-group">
            <button class="button" onclick="submitHHID()">
                <span class="material-icons">send</span> Submit & Send OTP
            </button>
            <button class="button secondary" onclick="navigate('display_meter')">
                <span class="material-icons">arrow_back</span> Back
            </button>
        </div>`,

    otp_verification: () => `
        <h1>Enter OTP</h1>
        <p>Check your email. Enter the 4-digit code.</p>
        <div id="error" class="error" style="display:none;"></div>
        <input type="text" id="otp" placeholder="Enter 4-digit OTP" maxlength="4" onfocus="showKeyboard(this)">
        <div class="button-group">
            <button class="button" onclick="submitOTP()">
                <span class="material-icons">verified</span> Verify OTP
            </button>
            <button class="button secondary" onclick="navigate('hhid_input')">
                <span class="material-icons">arrow_back</span> Back
            </button>
        </div>`,

input_source_detection: () => `
    <h1>Input Sources</h1>
    <p>Detected input sources on your system</p>
    <div id="error" class="error" style="display:none;"></div>
    <div class="loading" id="input-loading"><div class="spinner"></div><p>Detecting inputs...</p></div>
    <div id="input-results" style="display:none;">
        <ul id="input-list">
            <!-- Filled by JS -->
        </ul>
        <div class="button-group">
            <button class="button" onclick="navigate('video_object_detection')">
                <span class="material-icons">arrow_forward</span> Next
            </button>
            <button class="button secondary" onclick="navigate('otp_verification')">
                <span class="material-icons">arrow_back</span> Back
            </button>
        </div>
    </div>
`,

    video_object_detection: () => `
        <h1>Video Detection</h1>
        <p>Checking video object detection capabilities</p>
        <div class="loading" id="video-loading"><div class="spinner"></div><p>Running detection test...</p></div>
        <div id="video-results" style="display:none;">
            <div id="video-status"></div>
            <div class="button-group">
                <button class="button" onclick="navigate('finalize')">
                    <span class="material-icons">arrow_forward</span> Next
                </button>
                <button class="button secondary" onclick="navigate('input_source_detection')">
                    <span class="material-icons">arrow_back</span> Back
                </button>
            </div>
        </div>`,

    finalize: (details) => `
        <h1>Installation Summary</h1>
        <p>Review your installation details</p>
        <div id="error" class="error" style="display:none;"></div>
        <table class="details-table">
            <tr><th><span class="material-icons">electric_meter</span>Meter ID</th><td>${details.meter_id}</td></tr>
            <tr><th><span class="material-icons">home</span>Household ID</th><td>${details.hhid||'Not set'}</td></tr>
            <tr><th><span class="material-icons">signal_cellular_alt</span>Connectivity</th><td>${details.connectivity}</td></tr>
            <tr><th><span class="material-icons">input</span>Input Sources</th><td>${details.input_sources.join(', ')||'None'}</td></tr>
            <tr><th><span class="material-icons">videocam</span>Video Detection</th><td>${details.video_detection?'Working':'Not working'}</td></tr>
        </table>
        <div class="button-group">
            <button class="button" onclick="finalizeInstallation()">
                <span class="material-icons">check_circle</span> Finalize Installation
            </button>
            <button class="button secondary" onclick="navigate('video_object_detection')">
                <span class="material-icons">arrow_back</span> Back
            </button>
        </div>`,

    main: () => {
        const max = 8;
        const members = membersData?.members || [];
        const shown = members.slice(0, max);
        const empty = max - shown.length;

        const avatar = (g, a) => {
            if (!g||!a) return '/static/assets/default.png';
            const cat = a<=12?'kid':a<=19?'teen':a<=40?'middle':a<=60?'aged':'elder';
            return `/static/assets/${g.toLowerCase()}-${cat}.png`;
        };

        return `
            <div class="main-dashboard">
                <div class="members-grid">
                    ${shown.map((m,i)=>`
                        <div class="member-card-grid ${m.active===false?'inactive':'active'}"
                             onclick="toggleMember(${i})"
                             style="--bg-image:url('${avatar(m.gender,m.age)}')">
                            <div class="name-tag">${m.name||'Unknown'}</div>
                        </div>`).join('')}
                    ${Array(empty).fill().map(()=>`
                        <div class="member-card-grid empty"><div class="name-tag">—</div></div>
                    `).join('')}
                </div>
                <div class="bottom-bar">
                    <button class="bar-btn" onclick="showWiFiPopup()"><span class="material-icons">wifi</span><span>Wi-Fi</span></button>
                    <button class="bar-btn" onclick="restart()"><span class="material-icons">restart_alt</span><span>Reboot</span></button>
                    <button class="bar-btn" onclick="shutdown()"><span class="material-icons">power_settings_new</span><span>Shutdown</span></button>
                </div>
            </div>`;
    }
};

/* ==============================================================
   VIRTUAL KEYBOARD
   ============================================================== */
function showKeyboard(el) {
    activeInput = el;

    let kb = document.getElementById('virtual-keyboard');
    if (kb) { renderKeys(); scrollInputIntoView(); return; }

    kb = document.createElement('div');
    kb.id = 'virtual-keyboard';
    kb.className = 'virtual-keyboard';
    kb.innerHTML = `
        <div class="keyboard-header">
            <span class="keyboard-title"><span class="material-icons">keyboard</span> Keyboard</span>
            <button class="keyboard-close" onclick="hideKeyboard()"><span class="material-icons">close</span></button>
        </div>
        <div class="keyboard-body">
            <div class="keyboard-keys" id="keyboard-keys"></div>
            <div class="keyboard-bottom-row">
                <button class="key-special key-shift" onclick="toggleShift()">
                    <span class="material-icons">arrow_upward</span><span class="key-label">Shift</span>
                </button>
                <button class="key key-space" onclick="insertChar(' ')">Space</button>
                <button class="key-special key-backspace" onclick="backspace()"><span class="material-icons">backspace</span></button>
                <button class="key-special key-enter" onclick="pressEnter()">
                    <span class="material-icons">keyboard_return</span><span class="key-label">Enter</span>
                </button>
            </div>
        </div>`;
    document.body.appendChild(kb);
    renderKeys();
    scrollInputIntoView();

    kb.addEventListener('click', e=>e.stopPropagation());
    el.addEventListener('focus', e=>e.stopPropagation());
}
function renderKeys() {
    const container = document.getElementById('keyboard-keys');
    if (!container) return;
    const layout = shiftActive ? keyboardLayouts.shift : keyboardLayouts.normal;
    container.innerHTML = layout.map((row,i)=>`
        <div class="keyboard-row keyboard-row-${i}">
            ${row.map(k=>`<button class="key" onclick="insertChar('${k}')">${k}</button>`).join('')}
        </div>`).join('');
}
function toggleShift() {
    shiftActive = !shiftActive;
    const btn = document.querySelector('.key-shift');
    if (btn) btn.classList.toggle('active', shiftActive);
    renderKeys();
}
/* --------------------------------------------------------------
   INSERT CHARACTER (cursor stays where it should)
   -------------------------------------------------------------- */
function insertChar(ch) {
    if (!activeInput) return;

    const start = activeInput.selectionStart ?? 0;
    const end   = activeInput.selectionEnd   ?? 0;
    const text  = activeInput.value;

    // Replace selected text (if any) with the new character
    activeInput.value = text.slice(0, start) + ch + text.slice(end);

    // Move cursor right after the inserted character
    const newPos = start + ch.length;
    activeInput.setSelectionRange(newPos, newPos);
    activeInput.focus();

    scrollInputIntoView();

    // Auto-reset Shift after typing an uppercase letter
    if (shiftActive && /[A-Z]/.test(ch)) {
        setTimeout(() => {
            shiftActive = false;
            const btn = document.querySelector('.key-shift');
            if (btn) btn.classList.remove('active');
            renderKeys();
        }, 100);
    }
}

/* --------------------------------------------------------------
   BACKSPACE (cursor moves correctly)
   -------------------------------------------------------------- */
function backspace() {
    if (!activeInput) return;

    const start = activeInput.selectionStart ?? 0;
    const end   = activeInput.selectionEnd   ?? 0;
    const text  = activeInput.value;

    if (start !== end) {
        // Delete selected text
        activeInput.value = text.slice(0, start) + text.slice(end);
        activeInput.setSelectionRange(start, start);
    } else if (start > 0) {
        // Delete one character before the cursor
        activeInput.value = text.slice(0, start - 1) + text.slice(start);
        activeInput.setSelectionRange(start - 1, start - 1);
    } else {
        return; // nothing to delete
    }

    activeInput.focus();
    scrollInputIntoView();
}
function pressEnter() {
    if (!activeInput) return;
    hideKeyboard();
    if (activeInput.id==='hhid') submitHHID();
    else if (activeInput.id==='otp') submitOTP();
}
function hideKeyboard() {
    const kb = document.getElementById('virtual-keyboard');
    if (kb) { kb.classList.add('hiding'); setTimeout(()=>kb.remove(),300); }
    activeInput = null; shiftActive = false;
}
function scrollInputIntoView() {
    if (!activeInput) return;
    requestAnimationFrame(()=>{
        const rect = activeInput.getBoundingClientRect();
        const kb = document.getElementById('virtual-keyboard');
        if (!kb) return;
        const kbTop = kb.getBoundingClientRect().top;
        const bottom = rect.bottom;
        if (bottom > kbTop-100) {
            const scroll = bottom - (kbTop-120);
            window.scrollBy(0, scroll);
        }
        activeInput.focus();
    });
}

/* click-outside → hide keyboard */
document.addEventListener('click', e=>{
    const kb = document.getElementById('virtual-keyboard');
    const target = e.target.closest('input[type=text],input[type=password]');
    if (kb && !e.target.closest('.virtual-keyboard')) {
        if (target) { activeInput=target; renderKeys(); scrollInputIntoView(); }
        else hideKeyboard();
    }
});

/* ==============================================================
   RENDER & PROGRESS BAR
   ============================================================== */
function render(details=null) {
    const html = states[currentState](details);
    if (currentState==='main') {
        container.innerHTML = html;
        progressBar.style.display='none';
        setTimeout(()=>{ document.querySelectorAll('.member-card-grid').forEach(c=>{
            const bg=c.style.getPropertyValue('--bg-image')||'';
            if(bg) c.style.setProperty('--card-bg',bg);
        });},10);
    } else {
        container.innerHTML = `
            <div class="container"><div class="card">
                <div id="progress-bar-temp"></div>${html}
            </div></div>`;
        const tmp = container.querySelector('#progress-bar-temp');
        if (tmp && progressBar) { tmp.parentNode.insertBefore(progressBar,tmp); tmp.remove(); }
        progressBar.style.display='flex';
        updateProgressBar();
    }
}
function updateProgressBar() {
    if (!progressBar) return;
    const idx = steps.findIndex(s=>s.id===currentState);
    progressBar.innerHTML = steps.map((_,i)=>`<div class="progress-step ${i<=idx?'active':''}"></div>`).join('');
}

/* ==============================================================
   ERROR / SUCCESS MESSAGES
   ============================================================== */
function showError(msg, type='error') {
    const el = document.getElementById('error');
    if (!el) return;
    el.innerHTML = `<span class="material-icons">${type==='success'?'check_circle':'error'}</span> ${msg}`;
    el.className = type;
    el.style.display='flex';
    if (type==='success') setTimeout(()=>el.style.display='none',3000);
}

/* ==============================================================
   WIFI POP-UP
   ============================================================== */
async function showWiFiPopup() {
    closeWiFiPopup();
    const overlay = document.createElement('div'); overlay.id='wifi-overlay'; overlay.className='overlay'; overlay.onclick=closeWiFiPopup;
    const popup   = document.createElement('div'); popup.id='wifi-popup'; popup.className='popup';
    popup.innerHTML = `
        <h2><span class="material-icons">wifi</span> Select Wi-Fi</h2>
        <p>Choose a network to connect</p>
        <div id="wifi-error" class="error" style="display:none;"></div>
        <select id="ssid" onchange="togglePasswordField()"><option>Select Network</option></select>
        <input type="password" id="password" placeholder="Password" style="display:none;" onfocus="showKeyboard(this)">
        <div class="button-group">
            <button class="button" onclick="connectWiFi()">Connect</button>
            <button class="button secondary" onclick="disconnectWiFi()">Disconnect</button>
            <button class="button secondary" onclick="closeWiFiPopup()">Close</button>
        </div>`;
    document.body.append(overlay,popup);
    await scanWiFi();
}
async function scanWiFi() {
    const sel = document.getElementById('ssid');
    const err = document.getElementById('wifi-error');
    if (!sel||!err) return;
    try {
        const r = await fetch('/api/wifi/networks');
        const d = await r.json();
        if (d.success) {
            sel.innerHTML='<option>Select Network</option>';
            d.networks.forEach(n=>{
                const o=document.createElement('option');
                o.value=n.ssid;
                o.textContent=`${n.ssid} (${n.signal_strength}, ${n.security})`;
                sel.appendChild(o);
            });
        } else { err.innerHTML=`<span class="material-icons">error</span> ${d.error}`; err.style.display='flex'; }
    } catch { err.innerHTML=`<span class="material-icons">error</span> Scan failed`; err.style.display='flex'; }
}
function togglePasswordField() {
    const pw = document.getElementById('password');
    const ss = document.getElementById('ssid');
    if (pw && ss) pw.style.display = ss.value ? 'block' : 'none';
}
async function connectWiFi() {
    const ssid = document.getElementById('ssid')?.value;
    const pass = document.getElementById('password')?.value;
    const err  = document.getElementById('wifi-error');
    if (!ssid||!pass) { err.innerHTML='<span class="material-icons">error</span> SSID & password required'; err.className='error'; err.style.display='flex'; return; }
    try {
        const r = await fetch('/api/wifi/connect',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ssid,password:pass})
        });
        const d = await r.json();
        err.className = d.success?'success':'error';
        err.innerHTML = `<span class="material-icons">${d.success?'check_circle':'error'}</span> ${d.success?'Connected!':d.error}`;
        err.style.display='flex';
        if (d.success) setTimeout(async()=>{ closeWiFiPopup(); const cur=await fetch('/api/current_wifi'); const cd=await cur.json(); if(cd.success) navigate('connect_select',cd.ssid); },2000);
    } catch { err.innerHTML='<span class="material-icons">error</span> Connection failed'; err.style.display='flex'; }
}
async function disconnectWiFi() {
    const err = document.getElementById('wifi-error');
    try {
        const r = await fetch('/api/wifi/disconnect',{method:'POST'});
        const d = await r.json();
        err.className = d.success?'success':'error';
        err.innerHTML = `<span class="material-icons">${d.success?'check_circle':'error'}</span> ${d.message||d.error}`;
        err.style.display='flex';
        if (d.success) setTimeout(scanWiFi,2000);
    } catch { err.innerHTML='<span class="material-icons">error</span> Disconnect failed'; err.style.display='flex'; }
}
function closeWiFiPopup() {
    ['wifi-popup','wifi-overlay'].forEach(id=>{ const el=document.getElementById(id); if(el) el.remove(); });
    render();
}

/* ==============================================================
   NAVIGATION (with API calls)
   ============================================================== */
async function navigate(state, param=null) {
    currentState = state;

    /* ---------- CONNECT SELECT ---------- */
    if (state==='connect_select') {
        const cur = await fetch('/api/current_wifi');
        const cd  = await cur.json();
        render(cd.success ? cd.ssid : null);
        return;
    }

    /* ---------- NETWORK TEST (file-based) ---------- */
    if (state==='network_test') {
        connectivityMode = param;               // 'wifi' | 'gsm'
        render();                               // show spinner
        setTimeout(async()=>{
            const api = connectivityMode==='wifi' ? '/api/check_wifi' :
                        connectivityMode==='gsm'  ? '/api/check_gsm'  : null;
            if (!api) { render('error'); showError('Invalid mode'); return; }
            try {
                const r = await fetch(api);
                const d = await r.json();
                render(d.success ? 'success' : 'error');
                if (!d.success) showError(`${connectivityMode.toUpperCase()} not ready`);
            } catch { render('error'); showError('Network test failed'); }
        },1500);
        return;
    }

    /* ---------- INPUT SOURCES ---------- */
    if (state==='input_source_detection') {
        render();                     // show loading
        setTimeout(fetchInputSources,1000);
        return;
    }

    /* ---------- VIDEO DETECTION ---------- */
    if (state==='video_object_detection') {
        render();                     // show loading
        setTimeout(checkVideoDetection,1500);
        return;
    }

    /* ---------- FINALIZE ---------- */
    if (state==='finalize') {
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

    /* ---------- MAIN DASHBOARD ---------- */
    if (state==='main') await fetchMembers();
    render();
}

/* ==============================================================
   INPUT SOURCES API
   ============================================================== */
async function fetchInputSources() {
    const loading = document.getElementById('input-loading');
    const results = document.getElementById('input-results');
    const ul      = results?.querySelector('ul');

    if (!loading || !results || !ul) return;

    try {
        const r = await fetch('/api/input_sources');
        const d = await r.json();

        if (d.success && d.sources?.length > 0) {
            inputSources = d.sources;
            ul.innerHTML = d.sources.map(s => `
                <li><span class="material-icons">input</span> ${s}</li>
            `).join('');
        } else {
            inputSources = [];
            ul.innerHTML = '<li><span class="material-icons">info</span> No sources detected</li>';
            if (d.error) showError(d.error);
        }
    } catch (e) {
        inputSources = [];
        ul.innerHTML = '<li><span class="material-icons">error</span> Detection failed</li>';
        showError('Input detection failed');
    } finally {
        // Hide spinner, show results – NO render()
        loading.style.display = 'none';
        results.style.display = 'block';
    }
}

/* ==============================================================
   VIDEO DETECTION API
   ============================================================== */
async function checkVideoDetection() {
    const loading = document.getElementById('video-loading');
    const results = document.getElementById('video-results');
    const status  = document.getElementById('video-status');
    try {
        const r = await fetch('/api/video_detection');
        const d = await r.json();
        if (d.success && d.detected) {
            status.innerHTML = `<div class="success"><span class="material-icons">check_circle</span> Video detection active: ${d.status}</div>`;
            status.dataset.detected = 'true';
        } else {
            status.innerHTML = `<div class="info"><span class="material-icons">info</span> Video detection not running</div>`;
            status.dataset.detected = 'false';
        }
    } catch {
        status.innerHTML = `<div class="error"><span class="material-icons">error</span> Detection failed</div>`;
        status.dataset.detected = 'false';
    } finally {
        loading.style.display='none';
        results.style.display='block';
    }
}

/* ==============================================================
   OTHER API CALLS (unchanged)
   ============================================================== */
async function checkWiFi() {
    try {
        const r = await fetch('/api/check_wifi');
        const d = await r.json();
        if (d.success) {
            const cur = await fetch('/api/current_wifi');
            const cd  = await cur.json();
            if (cd.success) navigate('connect_select', cd.ssid);
            else showWiFiPopup();
        } else showWiFiPopup();
    } catch { showError('Wi-Fi check failed'); showWiFiPopup(); }
}
async function submitHHID() {
    hhid = document.getElementById('hhid')?.value.trim();
    if (!hhid) return showError('Enter HHID');
    const btn = event?.target;
    if (btn) { btn.disabled=true; btn.innerHTML='<span class="material-icons">hourglass_top</span> Sending...'; }
    try {
        const r = await fetch('/api/submit_hhid',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hhid})});
        const d = await r.json();
        if (d.success) { showError('OTP sent! Check email.','success'); setTimeout(()=>navigate('otp_verification'),1500); }
        else showError(d.error||'Invalid HHID');
    } catch { showError('Network error'); }
    finally { if (btn) { btn.disabled=false; btn.innerHTML='<span class="material-icons">send</span> Submit & Send OTP'; } }
}
async function submitOTP() {
    const otp = document.getElementById('otp')?.value.trim();
    if (!otp||otp.length!==4) return showError('Enter 4-digit OTP');
    const btn = event?.target;
    if (btn) { btn.disabled=true; btn.innerHTML='<span class="material-icons">hourglass_top</span> Verifying...'; }
    try {
        const r = await fetch('/api/submit_otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hhid,otp})});
        const d = await r.json();
        if (d.success) navigate('input_source_detection');
        else showError(d.error||'Invalid OTP');
    } catch { showError('Network error'); }
    finally { if (btn) { btn.disabled=false; btn.innerHTML='<span class="material-icons">verified</span> Verify OTP'; } }
}
async function finalizeInstallation() {
    const btn = event?.target;
    if (btn) { btn.disabled=true; btn.innerHTML='<span class="material-icons">hourglass_top</span> Finalizing...'; }
    try {
        const r = await fetch('/api/finalize',{method:'POST'});
        const d = await r.json();
        if (d.success) { membersData = d.data; navigate('main'); }
        else showError(d.error);
    } catch { showError('Failed to finalize'); }
    finally { if (btn) { btn.disabled=false; btn.innerHTML='<span class="material-icons">check_circle</span> Finalize Installation'; } }
}
async function fetchMembers() {
    try {
        const r = await fetch('/api/members');
        const d = await r.json();
        if (d.success) membersData = d.data;
    } catch (e) { console.error(e); }
}
async function toggleMember(idx) {
    if (!membersData?.members?.[idx]) return;
    try {
        const r = await fetch('/api/toggle_member_status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({index:idx})});
        const d = await r.json();
        if (d.success) { membersData.members[idx]=d.member; render(); }
        else showError(d.error||'Failed to update');
    } catch { showError('Network error'); }
}
async function shutdown() {
    if (!confirm('Shutdown system?')) return;
    try { const r=await fetch('/api/shutdown',{method:'POST'}); const d=await r.json(); alert(d.success?'Shutting down...':d.error); }
    catch { alert('Shutdown failed'); }
}
async function restart() {
    if (!confirm('Restart system?')) return;
    try { const r=await fetch('/api/restart',{method:'POST'}); const d=await r.json(); alert(d.success?'Restarting...':d.error); }
    catch { alert('Restart failed'); }
}

/* ==============================================================
   INITIALISATION
   ============================================================== */
async function init() {
    try {
        const r = await fetch('/api/check_installation');
        const d = await r.json();
        meterId = d.meter_id;
        currentState = d.installed ? 'main' : 'welcome';
        if (d.installed) await fetchMembers();
        render();
    } catch { currentState='welcome'; render(); }
}
init();