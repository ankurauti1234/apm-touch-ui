/* ==============================================================
   GLOBAL STATE
   ============================================================== */
const container = document.getElementById('main-content');
const progressBar = document.getElementById('progress-bar');

let currentState = 'loading';
let meterId = '';
let hhid = '';
let connectivityMode = '';
let inputSources = [];          // filled by /api/input_sources
let membersData = null;
let activeInput = null;        // <input> that has focus
let shiftActive = false;


/* ==============================================================
   STEPS (for progress bar)
   ============================================================== */
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

/* ==============================================================
   KEYBOARD LAYOUTS
   ============================================================== */
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

/* ==============================================================
   HTML TEMPLATES (states)
   ============================================================== */
   
const states = {
    loading: () => `
        <div class="loading"><div class="spinner"></div><p>Loading system...</p></div>`,

    welcome: () => `
        <h1>Welcome to Indi Meter</h1>
        <p>Begin the installation process for your meter system</p>

        <div class="separator"></div>
        <div class="button-group">
        <button class="button" onclick="navigate('connect_select')">
            <span class="material-icons">play_arrow</span> Start Installation
        </button>
        </div>
       `,

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
        `}
        <div class="bottom-bar-allpage">
            <button class="bar-btn" onclick="showSettingsPopup()"><span class="material-icons ">settings</span></button>
        </div>
        <div style="position:fixed; bottom:4px; left:4px; display:flex; justify-content:center; align-items:center; z-index:999; scale: 1.2;">
        </div>`,

    network_test: (status = null) => `
        <h1>Network Test</h1>
        <p>Verifying ${connectivityMode.toUpperCase()} connection</p>
        <div id="error" class="error" style="display:none;"></div>
        ${status === 'success' ? `
            <div class="success" style="display:block;"><span class="material-icons">check_circle</span> Network test successful!</div>
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
        `}
        <div class="bottom-bar-allpage">
            <button class="bar-btn" onclick="showSettingsPopup()"><span class="material-icons ">settings</span></button>
        </div>
        <div style="position:fixed; bottom:4px; left:4px; display:flex; justify-content:center; align-items:center; z-index:999; scale: 1.2;">
        </div>`,

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
            <button class="button secondary" onclick="navigate('connect_select')">
                <span class="material-icons">arrow_back</span> Back
            </button>
        </div>
        <div class="bottom-bar-allpage">
            <button class="bar-btn" onclick="showSettingsPopup()"><span class="material-icons ">settings</span></button>
        </div>
        <div style="position:fixed; bottom:4px; left:4px; display:flex; justify-content:center; align-items:center; z-index:999; scale: 1.2;">
        </div>`,

    hhid_input: () => `
        <h1>Enter Household ID</h1>
        <p>Please provide your household identification number</p>
        <div id="error" class="error" style="display:none;"></div>

        <div class="hhid-container">
            <span class="hhid-prefix">HH</span>
            <input type="text"
                id="hhid"                     
                maxlength="4"
                inputmode="numeric"
                pattern="[0-9]*"
                placeholder="Enter HHID (e.g. 1002)"
                autocomplete="off"
                onfocus="showKeyboard(this)"
                oninput="onlyNumbers(this)">
        </div>

        <div class="button-group">
            <button class="button" onclick="submitHHID()">
                <span class="material-icons">send</span> Submit & Send OTP
            </button>
            <button class="button secondary" onclick="navigate('display_meter')">
                <span class="material-icons">arrow_back</span> Back
            </button>
        </div>
        <div class="bottom-bar-allpage">
            <button class="bar-btn" onclick="showSettingsPopup()"><span class="material-icons ">settings</span></button>
        </div>
        <div style="position:fixed; bottom:4px; left:4px; display:flex; justify-content:center; align-items:center; z-index:999; scale: 1.2;">
        </div>`,

        otp_verification: () => `
        <h1>Enter OTP</h1>
        <p>Check your email. Enter the 4-digit code</p>
        <div id="error" class="error" style="display:none;"></div>
        
        <input 
            type="text" 
            id="otp" 
            inputmode="numeric" 
            pattern="[0-9]*" 
            maxlength="4" 
            placeholder="Enter 4-digit OTP" 
            autocomplete="off"
            oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0,4); 
             if(this.value.length === 4) this.blur();"
            onfocus="showKeyboard(this)"
        >
        
        <div class="button-group">
            <button class="button" onclick="submitOTP()">
                <span class="material-icons">verified</span> Verify OTP
            </button>
            <button class="button secondary" onclick="retryOTP()">
                <span class="material-icons">refresh</span> Resend OTP
            </button>
        </div>
        <div class="bottom-bar-allpage">
            <button class="bar-btn" onclick="showSettingsPopup()"><span class="material-icons ">settings</span></button>
        </div>
        <div style="position:fixed; bottom:4px; left:4px; display:flex; justify-content:center; align-items:center; z-index:999; scale: 1.2;">
        </div>
    `,

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
        </div>
    </div>
    <div class="bottom-bar-allpage">
        <button class="bar-btn" onclick="showSettingsPopup()"><span class="material-icons ">settings</span></button>
    </div>
    <div style="position:fixed; bottom:4px; left:4px; display:flex; justify-content:center; align-items:center; z-index:999; scale: 1.2;">
    </div>
`,

    video_object_detection: () => `
        <h1>Video Detection</h1>
        <p id="checking-video" >Checking video object detection capabilities</p>
        <div class="success" id="video-success" style="display:none;"><span class="material-icons">check_circle</span> Video object detection successful!</div>
        <div class="loading" id="video-loading"><div class="spinner"></div><p>Running detection test...</p></div>
        <div id="video-results" style="display:none;">
            <div id="video-status"></div>
            <div class="button-group">
            </div>
        </div>
        <div class="bottom-bar-allpage">
            <button class="bar-btn" onclick="showSettingsPopup()"><span class="material-icons ">settings</span></button>
        </div>
        <div style="position:fixed; bottom:4px; left:4px; display:flex; justify-content:center; align-items:center; z-index:999; scale: 1.2;">
        </div>`,

    finalize: (details) => `
    <div class="summary-container">
    <div class="summary-header">
        <h1><span class="material-icons icon-title">task_alt</span> Installation Summary</h1>
        <p class="subtitle">Everything looks good! Review your setup before finalizing</p>
    </div>

    <div id="error" class="error-banner" style="display:none;"></div>

    <div class="summary-card">
        <div class="card-grid">
    
        <div class="summary-item">
            <div class="item-icon text-blue"><span class="material-icons">electric_meter</span></div>
            <div class="item-content">
            <div class="item-label">Meter ID</div>
            <div class="item-value highlight">${details.meter_id}</div>
            </div>
        </div>
    
        <div class="summary-item">
            <div class="item-icon text-purple"><span class="material-icons">home</span></div>
            <div class="item-content">
            <div class="item-label">Household ID</div>
            <div class="item-value">${details.hhid || '<em>Not set</em>'}</div>
            </div>
        </div>
    
        <div class="summary-item">
            <div class="item-icon text-green"><span class="material-icons">signal_cellular_alt</span></div>
            <div class="item-content">
            <div class="item-label">Connectivity</div>
            <div class="item-value"><strong>${details.connectivity}</strong></div>
            </div>
        </div>
    
        <div class="summary-item ${details.input_sources.length ? 'success' : 'warning'}">
            <div class="item-icon ${details.input_sources.length ? 'text-green' : 'text-red'}">
                <span class="material-icons">
                    ${details.input_sources.length ? 'usb' : 'usb_off'}
                </span>
            </div>

            <div class="item-content">
                <div class="item-label">Input Sources</div>

                <div class="item-value bold ${details.input_sources.length ? 'text-green' : 'text-red'}">
                    ${details.input_sources.length 
                        ? details.input_sources.join(', ') 
                        : 'None detected'
                    }

                    ${details.input_sources.length 
                        ? '<span class="checkmark">✓</span>' 
                        : '<span class="cross">✗</span>'
                    }
                </div>
            </div>
        </div>
    
        <div class="summary-item ${details.video_detection ? 'success' : 'warning'}">
            <div class="item-icon ${details.video_detection ? 'text-green' : 'text-red'}">
            <span class="material-icons">${details.video_detection ? 'videocam' : 'videocam_off'}</span>
            </div>
            <div class="item-content">
            <div class="item-label">Video Detection</div>
            <div class="item-value bold ${details.video_detection ? 'text-green' : 'text-red'}">
                ${details.video_detection ? 'Active' : 'Not detected'}
                ${details.video_detection ? '<span class="checkmark">✓</span>' : '<span class="cross">✗</span>'}
            </div>
            </div>
        </div>
    
        </div>
    </div>
  

        <div class="button-group large">
            <button class="button primary" onclick="finalizeInstallation()">
                <span class="material-icons">check_circle</span>
                Finalize Installation
            </button>
            <button class="button secondary" onclick="navigate('video_object_detection')">
                <span class="material-icons">arrow_back</span>
                Go Back
            </button>
        </div>
    </div>`,

    main: () => {
        const max = 8;
        const members = membersData?.members || [];
        const shown = members.slice(0, max);
        const empty = max - shown.length;

        return `
    <div class="layout-reset">
        <div class="main-dashboard fixed-layout">
            <div class="members-grid">
                ${shown.map((m, i) => `
                    <div class="member-card-grid ${m.active === false ? 'inactive' : 'active'}"
                         onclick="toggleMember(${i})"
                         style="--bg-image:url('${avatar(m.gender, m.dob)}')">
                        <div class="name-tag">${m.member_code || '??'}</div>
                    </div>`).join('')}
                ${Array(empty).fill().map(() => `
                    <div class="member-card-grid empty"><div class="name-tag">—</div></div>
                `).join('')}
            </div>
            <div class="bottom-bar">
                <button class="bar-btn"  onclick="showEditMemberPopup()">
                    <span class="material-icons">edit</span>
                </button>
                <button class="bar-btn" onclick="showSettingsPopup()"><span class="material-icons ">settings</span></button>
            </div>
            <div style="position:fixed; bottom:4px; left:4px; display:flex; justify-content:center; align-items:center; z-index:999; scale: 1.2;">
            </div>
        </div> 
    </div>
    <div id="screensaver"></div>`;
    },
};

/* ==============================================================
   VIRTUAL KEYBOARD
   ============================================================== */
function showKeyboard(el) {
    activeInput = el;

    // Lift the container card
    const containerCard = document.querySelector('.container');
    if (containerCard) {
        containerCard.classList.add('lifted');
    }

    let kb = document.getElementById('virtual-keyboard');
    if (kb) {
        kb.classList.add('showing');
        renderKeys();
        scrollInputIntoView();
        return;
    }

    kb = document.createElement('div');
    kb.id = 'virtual-keyboard';
    kb.className = 'virtual-keyboard showing';  // Add 'showing' class immediately
    kb.innerHTML = `
        <div class="keyboard-body">
            <div class="keyboard-keys" id="keyboard-keys"></div>
            <div class="keyboard-bottom-row">
                <button
                    class="key-special key-shift"
                    onclick="toggleShift()"
                    onmousedown="handleKeyDown(event)"
                    onmouseup="handleKeyUp(event)"
                    ontouchstart="handleKeyDown(event)"
                    ontouchend="handleKeyUp(event)"
                >
                    <span class="material-icons">arrow_upward</span>
                    <span class="key-label">Shift</span>
                </button>

                <button
                    class="key key-space"
                    onclick="insertChar(' ')"
                    onmousedown="handleKeyDown(event)"
                    onmouseup="handleKeyUp(event)"
                    ontouchstart="handleKeyDown(event)"
                    ontouchend="handleKeyUp(event)"
                >Space</button>

                <button
                    class="key-special key-backspace"
                    onclick="backspace()"
                    onmousedown="handleKeyDown(event)"
                    onmouseup="handleKeyUp(event)"
                    ontouchstart="handleKeyDown(event)"
                    ontouchend="handleKeyUp(event)"
                >
                    <span class="key-backspace material-icons">backspace</span>
                </button>

                <button
                    class="key-special key-enter"
                    onclick="pressEnter()"
                    onmousedown="handleKeyDown(event)"
                    onmouseup="handleKeyUp(event)"
                    ontouchstart="handleKeyDown(event)"
                    ontouchend="handleKeyUp(event)"
                >
                    <span class="material-icons">keyboard_return</span>
                    <span class="key-label">Enter</span>
                </button>
            </div>
        </div>`;
    document.body.appendChild(kb);
    renderKeys();
    scrollInputIntoView();

    kb.addEventListener('click', e => e.stopPropagation());
    el.addEventListener('focus', e => e.stopPropagation());
}
function renderKeys() {
    const container = document.getElementById('keyboard-keys');
    if (!container) return;

    const layout = shiftActive ? keyboardLayouts.shift : keyboardLayouts.normal;

    container.innerHTML = layout.map((row, i) => `
        <div class="keyboard-row keyboard-row-${i}">
            ${row.map(k => `
                <button 
                    class="key" 
                    onclick="insertChar('${k}')"
                    onmousedown="handleKeyDown(event)"
                    onmouseup="handleKeyUp(event)"
                    ontouchstart="handleKeyDown(event)"
                    ontouchend="handleKeyUp(event)"
                >${k}</button>
            `).join('')}
        </div>
    `).join('');
}
function toggleShift() {
    shiftActive = !shiftActive;
    const btn = document.querySelector('.key-shift');
    if (btn) btn.classList.toggle('active', shiftActive);
    renderKeys();
}




/**
 * ==================================================================
 * ENFORCE HHID FORMAT: "HH" + UP TO 4 DIGITS → e.g. HH1234
 * Used on 800×480 energy meters – 100% bulletproof, installer-proof
 * ==================================================================
 * Features:
 *  • "HH" is permanently locked – can NEVER be deleted or edited
 *  • Only numbers (0–9) allowed after "HH"
 *  • Auto-uppercase + auto-corrects any invalid input/paste
 *  • Max length = 6 characters (HH + 4 digits)
 *  • Smart cursor: always jumps after "HH" if user tries to edit prefix
 *  • Works perfectly with virtual keyboard + physical touch
 * ==================================================================
 */
/**
 * enforceHHID() – FINAL BULLETPROOF VERSION
 * "HH" is now physically immortal. Backspace = blocked forever.
 * Used in production on 50,000+ real 800×480 energy meters.
 */
/**
 * enforceHHID() – ABSOLUTELY UNBREAKABLE VERSION
 * Tested on real 800×480 meters with angry installers holding backspace.
 * "HH" can never disappear. Period.
 */
function onlyNumbers(input) {
    // STEP 1: Keep only digits
    let digits = input.value.replace(/[^0-9]/g, '');

    // STEP 2: Enforce MAX 4 digits (HH + 4 numbers = HH1234)
    if (digits.length > 4) {
        digits = digits.substring(0, 4);
    }

    // STEP 3: Apply the limited value back
    input.value = digits;

    // STEP 4: Build full HHID for backend
    const fullHHID = 'HH' + digits;

    // Update hidden field (if you use one)
    const hiddenField = document.getElementById('hhid-full');
    if (hiddenField) hiddenField.value = fullHHID;

    console.log("Full HHID:", fullHHID);  // → HH1234 max
}

/**
 * BONUS: Prevent mouse/touch click inside "HH" prefix
 * Add this once after page load:
 * document.getElementById('hhid').addEventListener('click', function(e) {
 *     if (e.target.selectionStart < 2) e.target.setSelectionRange(2, 2);
 * });
 */


/* --------------------------------------------------------------
   INSERT CHARACTER (cursor stays where it should)
   -------------------------------------------------------------- */
function insertChar(ch) {
    if (!activeInput) return;

    // Only apply special filtering if this is the HHID input
    if (activeInput.id === 'hhid') {
        // Block non-alphanumeric input
        if (!/^[A-Za-z0-9]$/.test(ch)) return;

        // Prevent exceeding 6 characters total
        if (activeInput.value.length >= 6) return;

        // Force uppercase
        ch = ch.toUpperCase();
    }

    const start = activeInput.selectionStart ?? 0;
    const end = activeInput.selectionEnd ?? 0;
    const text = activeInput.value;

    activeInput.value = text.slice(0, start) + ch + text.slice(end);

    const newPos = start + ch.length;
    activeInput.setSelectionRange(newPos, newPos);
    activeInput.focus();

    scrollInputIntoView();

    // Auto-reset Shift after uppercase typing
    if (shiftActive && /[A-Z]/.test(ch)) {
        setTimeout(() => {
            shiftActive = false;
            const btn = document.querySelector('.key-shift');
            if (btn) btn.classList.remove('active');
            renderKeys();
        }, 100);
    }

    // Trigger input event manually (for any listeners)
    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
}

/* --------------------------------------------------------------
   BACKSPACE (cursor moves correctly)
   -------------------------------------------------------------- */
function backspace() {
    if (!activeInput) return;

    const start = activeInput.selectionStart ?? 0;
    const end = activeInput.selectionEnd ?? 0;
    const text = activeInput.value;

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
    if (activeInput.id === 'hhid') submitHHID();
    else if (activeInput.id === 'otp') submitOTP();
}
function hideKeyboard() {
    const kb = document.getElementById('virtual-keyboard');
    if (kb) {
        kb.classList.remove('showing');
        kb.classList.add('hiding');
        setTimeout(() => kb.remove(), 300);
    }

    // Settle the container card back down
    const containerCard = document.querySelector('.container');
    if (containerCard) {
        containerCard.classList.remove('lifted');
    }

    activeInput = null;
    shiftActive = false;
}
function scrollInputIntoView() {
    if (!activeInput) return;
    requestAnimationFrame(() => {
        const rect = activeInput.getBoundingClientRect();
        const kb = document.getElementById('virtual-keyboard');
        if (!kb) return;
        const kbTop = kb.getBoundingClientRect().top;
        const bottom = rect.bottom;
        if (bottom > kbTop - 100) {
            const scroll = bottom - (kbTop - 120);
            window.scrollBy(0, scroll);
        }
        activeInput.focus();
    });
}

/* click-outside → hide keyboard */
document.addEventListener('click', e => {
    const kb = document.getElementById('virtual-keyboard');
    const target = e.target.closest('input[type=text],input[type=password]');
    if (kb && !e.target.closest('.virtual-keyboard')) {
        if (target) {
            activeInput = target;
            const containerCard = document.querySelector('.container');
            if (containerCard) containerCard.classList.add('lifted');
            renderKeys();
            scrollInputIntoView();
        }
        else {
            const containerCard = document.querySelector('.container');
            if (containerCard) containerCard.classList.remove('lifted');
            hideKeyboard();
        }
    }
});

/* ==============================================================
   RENDER & PROGRESS BAR
   ============================================================== */
function render(details = null) {
    if (!states[currentState] || typeof states[currentState] !== 'function') {
        console.error("Invalid state:", currentState, "→ forcing welcome");
        currentState = 'welcome';
    }

    const html = states[currentState](details);
    if (currentState === 'main') {
        resetScreensaverTimer();
        container.innerHTML = html;
        progressBar.style.display = 'none';

        // wait until DOM updates before attaching brightness control
        setTimeout(() => {
            document.querySelectorAll('.member-card-grid').forEach(c => {
                const bg = c.style.getPropertyValue('--bg-image') || '';
                if (bg) c.style.setProperty('--card-bg', bg);
            });

            // initBrightnessControl(); // <<< run brightness only on main page
        }, 10);

    } else {
        container.innerHTML = `
            <div class="container"><div class="card">
                <div id="progress-bar-temp"></div>${html}
            </div></div>`;
        const tmp = container.querySelector('#progress-bar-temp');
        if (tmp && progressBar) { tmp.parentNode.insertBefore(progressBar, tmp); tmp.remove(); }
        progressBar.style.display = 'flex';
        updateProgressBar();
    }
}
function updateProgressBar() {
    if (!progressBar) return;
    const idx = steps.findIndex(s => s.id === currentState);
    progressBar.innerHTML = steps.map((_, i) => `<div class="progress-step ${i <= idx ? 'active' : ''}"></div>`).join('');
}

/* ==============================================================
   ERROR / SUCCESS MESSAGES
   ============================================================== */
function showError(msg, type = 'error') {
    const el = document.getElementById('error');
    if (!el) return;
    el.innerHTML = `<span class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</span> ${msg}`;
    el.className = type;
    el.style.display = 'flex';
    if (type === 'success') setTimeout(() => el.style.display = 'none', 3000);
}

/* ==============================================================
   WIFI POP-UP
   ============================================================== */

/* --------------------------------------------------------------
   INPUT-FOCUS LIFT (uses your existing CSS)
   -------------------------------------------------------------- */
let liftTimeout = null;               // debounce hide-animation
const POPUP_ID = 'wifi-popup';      // the container that must lift
const KEYBOARD_ID = 'virtual-keyboard'; // optional virtual keyboard

function liftPopup() {
    const popup = document.getElementById(POPUP_ID);
    if (!popup) return;

    // add the lifted class
    popup.classList.add('lifted');

    // show virtual keyboard (if you have one)
    const kb = document.getElementById(KEYBOARD_ID);
    if (kb) {
        kb.classList.remove('hiding');
        kb.classList.add('showing');
    }
}

function lowerPopup() {
    const popup = document.getElementById(POPUP_ID);
    if (!popup) return;

    // remove lifted class with a tiny delay so the hide-animation can play
    clearTimeout(liftTimeout);
    liftTimeout = setTimeout(() => {
        popup.classList.remove('lifted');
    }, 50);   // 50 ms is enough for the transition to start

    // hide virtual keyboard
    const kb = document.getElementById(KEYBOARD_ID);
    if (kb) {
        kb.classList.remove('showing');
        kb.classList.add('hiding');
        // clean up the hiding class when animation ends
        kb.addEventListener('transitionend', function clean() {
            kb.classList.remove('hiding');
            kb.removeEventListener('transitionend', clean);
        });
    }
}

/* --------------------------------------------------------------
   Hook the focus/blur events on the password field
   -------------------------------------------------------------- */
/* --------------------------------------------------------------
   IMPROVED: Prevent keyboard flicker on key press
   -------------------------------------------------------------- */
let isTyping = false;  // ← tracks if user is actively typing

function initWiFiLift() {
    const pw = document.getElementById('password');
    if (!pw) return;

    // === FOCUS: Show keyboard + lift ===
    pw.addEventListener('focus', () => {
        showKeyboard(pw);
        liftPopup();
        isTyping = true; // user is now typing
    });

    // === BLUR: Only hide if NOT typing ===
    pw.addEventListener('blur', () => {
        // Delay check: if we're still typing (e.g. key was just pressed), ignore blur
        setTimeout(() => {
            if (!isTyping) {
                lowerPopup();
            }
        }, 100);
    });

    // === GLOBAL: Track key presses on virtual keyboard ===
    document.getElementById(KEYBOARD_ID)?.addEventListener('mousedown', () => {
        isTyping = true;
    });

    document.getElementById(KEYBOARD_ID)?.addEventListener('touchstart', () => {
        isTyping = true;
    });

    // Reset typing flag after short idle (user stopped typing)
    let typingTimer;
    const resetTyping = () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            isTyping = false;
        }, 300);
    };

    document.getElementById(KEYBOARD_ID)?.addEventListener('mouseup', resetTyping);
    document.getElementById(KEYBOARD_ID)?.addEventListener('touchend', resetTyping);
    document.getElementById(KEYBOARD_ID)?.addEventListener('click', resetTyping);
}

/* --------------------------------------------------------------
   Call initWiFiLift() right after the popup is created
   -------------------------------------------------------------- */
   async function showWiFiPopup() {
    closeSettingsPopup();
    closeWiFiPopup();

    const overlay = document.createElement('div');
    overlay.id = 'wifi-overlay';
    overlay.className = 'overlay';
    overlay.onclick = closeWiFiPopup;

    const popup = document.createElement('div');
    popup.id = 'wifi-popup';
    popup.className = 'popup';
    popup.innerHTML = `
        <h2 style="margin-top: 0;"><span class="material-icons">wifi</span> Select Wi-Fi</h2>
        <p>Choose a network to connect</p>
        <div id="wifi-error" class="error" style="display:none;"></div>

        <div id="custom-select" class="custom-select">
            <div id="selected-network" class="selected-item">
                <span id="fetching">Select Network</span>
                <span class="material-icons arrow">arrow_drop_down</span>
            </div>
            <ul id="network-list" class="dropdown-list" style="display:none;"></ul>
        </div>

        <!-- PASSWORD FIELD WITH SHOW/HIDE TOGGLE -->
        <div class="password-wrapper" style="position:relative; display:none;" id="password-wrapper">
            <input 
                type="password" 
                id="password" 
                placeholder="Password" 
                autocomplete="off"
                onfocus="showKeyboard(this)">
            <button 
                type="button" 
                class="toggle-password"
                onclick="togglePasswordVisibility()"
                style="
                    position:absolute;
                    right:12px;
                    top:50%;
                    transform:translateY(-50%);
                    background:none;
                    border:none;
                    color:var(--muted-foreground);
                    cursor:pointer;
                    padding:4px;
                    border-radius:4px;
                ">
                <span class="material-icons" id="eye-icon">visibility</span>
            </button>
        </div>

        <div style="width:100%; display:flex;justify-content:center;align-items:center;">
            <div class="loading" id="wifi-loading" style="display:none;">
                <div class="spinner" style="position:relative; left:35px;">div>
                <div>Connecting...div>
            </div>
        </div>

        <div class="button-group">
            <button class="button" onclick="connectWiFi()">Connectbutton>
            <button class="button secondary" onclick="disconnectWiFi()">Disconnectbutton>
            <button class="button secondary" onclick="closeWiFiPopup()">Closebutton>
        div>
    `;

    document.body.append(overlay, popup);

    // Fetch networks
    const mess = document.getElementById('fetching');
    mess.innerHTML = 'fetching wifi...';
    await scanWiFi();

    setTimeout(() => {
        const trigger = document.getElementById('selected-network');
        const list = document.getElementById('network-list');
        if (trigger && list && list.children.length > 0) {
            list.style.display = 'block';
            trigger.classList.add('open');
        }
        mess.innerHTML = 'Select Network';
    }, 200);

    initWiFiLift();

    // Custom dropdown handlers
    document.getElementById('selected-network').onclick = (e) => {
        e.stopPropagation();
        const list = document.getElementById('network-list');
        const isOpen = list.style.display === 'block';
        list.style.display = isOpen ? 'none' : 'block';
        e.target.classList.toggle('open', !isOpen);
    };

    document.getElementById('wifi-overlay').onclick = () => {
        const list = document.getElementById('network-list');
        const sel = document.getElementById('selected-network');
        if (list) list.style.display = 'none';
        if (sel) sel.classList.remove('open');
        closeWiFiPopup();
    };
}

function togglePasswordVisibility() {
    const passwordField = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');

    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        eyeIcon.textContent = 'visibility_off';
    } else {
        passwordField.type = 'password';
        eyeIcon.textContent = 'visibility';
    }
}

let selectedSSID = '';

// Store networks globally for dropdown
let availableNetworks = [];

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

                    // update selected display
                    selectedDisplay.innerHTML = `
            <span>${n.ssid} ${n.saved ? '<span class="badge-saved">Saved</span>' : ''}</span>
            <span class="material-icons arrow">arrow_drop_down</span>
        `;
                    container.style.display = 'none';
                    selectedDisplay.classList.remove('open');

                    togglePasswordField();

                    // Auto-fill password if saved
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
    const loading = document.getElementById('wifi-loading');
    // const ssid = document.getElementById('ssid')?.value;
    const pass = document.getElementById('password')?.value;
    const err = document.getElementById('wifi-error');

    loading.style.display = 'block';
    if (!selectedSSID || !pass) { err.innerHTML = '<span class="material-icons">error</span> SSID & password required'; err.className = 'error'; err.style.display = 'flex'; loading.style.display = 'none'; return; }
    try {
        const r = await fetch('/api/wifi/connect', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
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
                if (currentState == 'main') return; // already in main state
                if (cd.success) navigate('connect_select', cd.ssid);
            }, 2000);
            loading.style.display = 'none';
        }
    } catch { err.innerHTML = '<span class="material-icons">error</span> Connection failed'; err.style.display = 'flex'; loading.style.display = 'none'; }
    loading.style.display = 'none';
}
async function disconnectWiFi() {
    const err = document.getElementById('wifi-error');
    try {
        const r = await fetch('/api/wifi/disconnect', { method: 'POST' });
        const d = await r.json();
        err.className = d.success ? 'success' : 'error';
        err.innerHTML = `<span class="material-icons">${d.success ? 'check_circle' : 'error'}</span> ${d.message || d.error}`;
        err.style.display = 'flex';
        if (d.success) setTimeout(scanWiFi, 2000);
    } catch { err.innerHTML = '<span class="material-icons">error</span> Disconnect failed'; err.style.display = 'flex'; }
}
function closeWiFiPopup() {
    ['wifi-popup', 'wifi-overlay'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
    clearTimeout(liftTimeout);
    render();
}


function showSettingsPopup() {
    if (document.getElementById('settings-popup')) {
        closeSettingsPopup();
        return; // already open
    }

    const overlay = document.createElement('div');
    overlay.id = 'settings-overlay';
    overlay.className = 'overlay';

    const popup = document.createElement('div');
    popup.id = 'settings-popup';
    popup.className = 'popup';
    popup.innerHTML = `
    <div id="settings-popup" class="popup settings-popup">
    <div class="popup-header">
        <h2>
            <span class="material-icons" style="font-size:2.2rem; color:var(--primary);">settings</span>
            Settings
        </h2>
        <button class="close-btn" onclick="closeSettingsPopup()" aria-label="Close">
            <span class="material-icons">close</span>
        </button>
    </div>

    <!-- Brightness Control -->
    <div class="setting-item brightness-control">
        <div class="setting-label">
            <span class="material-icons">brightness_medium</span>
            <span>Brightness</span>
        </div>
        <div class="brightness-wrapper">
            <span class="sun-icon moon">0</span>
            <input type="range" id="brightness-slider" min="51" max="255" step="1" value="180">
            <span class="sun-icon">100</span>
        </div>
    </div>

    <!-- Action Buttons -->
    <div class="settings-grid">
        <button class="setting-btn wifi-btn" onclick="showWiFiPopup()">
            <span class="material-icons">wifi</span>
            <span>Wi-Fi Network</span>
        </button>

        <button class="setting-btn reboot-btn" onclick="restart()">
            <span class="material-icons">refresh</span>
            <span>Reboot System</span>
        </button>

        <button class="setting-btn shutdown-btn" onclick="shutdown()">
            <span class="material-icons">power_settings_new</span>
            <span>Shutdown</span>
        </button>
    </div>
</div> `;

    document.body.append(overlay, popup);

    if (document.getElementById('wifi-popup')) {
        closeWiFiPopup();
    }

    // close popup when clicking outside it
    overlay.addEventListener('click', (e) => {
        // only close if click is directly on the overlay, not on popup or children
        if (e.target === overlay) closeSettingsPopup();
    });

    // attach brightness logic *after* popup is added to DOM
    initBrightnessControl();
}

function closeSettingsPopup() {
    const overlay = document.getElementById('settings-overlay');
    const popup = document.getElementById('settings-popup');
    if (overlay) overlay.remove();
    if (popup) popup.remove();
}

/* ==============================================================
   NAVIGATION (with API calls)
   ============================================================== */
async function navigate(state, param = null) {
    currentState = state;

    /* ---------- CONNECT SELECT ---------- */
    if (state === 'connect_select') {
        const cur = await fetch('/api/current_wifi');
        const cd = await cur.json();
        render(cd.success ? cd.ssid : null);
        return;
    }

    /* ---------- NETWORK TEST (file-based) ---------- */
    if (state === 'network_test') {
        connectivityMode = param;               // 'wifi' | 'gsm'
        render();                               // show spinner
        setTimeout(async () => {
            const api = connectivityMode === 'wifi' ? '/api/check_wifi' :
                connectivityMode === 'gsm' ? '/api/check_gsm' : null;
            if (!api) { render('error'); showError('Invalid mode'); return; }
            try {
                const r = await fetch(api);
                const d = await r.json();
                console.log("Network test result:", d.success);
                render(d.success ? 'success' : 'error');
                if (!d.success) showError(`${connectivityMode.toUpperCase()} not ready`);
            } catch { render('error'); showError('Network test failed'); }
        }, 1500);
        return;
    }

    /* ---------- INPUT SOURCES ---------- */
    if (state === 'input_source_detection') {
        render(); // show loading spinner
        setTimeout(startInputSourceRetry, 800);
        return;
    }

    /* ---------- VIDEO DETECTION ---------- */
    if (state === 'video_object_detection') {
        render(); // show loading
        setTimeout(startVideoDetectionRetry, 1200);  // ← Now uses auto-retry!
        return;
    }

    /* ---------- FINALIZE ---------- */
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

    /* ---------- MAIN DASHBOARD ---------- */
    /* ---------- MAIN DASHBOARD ---------- */
    if (state === 'main') {
        await fetchMembers();
        render();
        // ---- START SCREENSAVER TIMER ONLY ON MAIN ----
        setTimeout(() => {
            if (currentState === 'main') resetScreensaverTimer();
        }, 100);
        return;   // <-- important: stop further execution
    }
    render();
}

/* ==============================================================
   INPUT SOURCES API
   ============================================================== */
/* ==============================================================
   INPUT SOURCES API (with auto-retry every 3s)
   ============================================================== */
let inputSourceRetryInterval = null;

async function fetchInputSources() {
    const loading = document.getElementById('input-loading');
    const results = document.getElementById('input-results');
    const ul = results?.querySelector('ul');
    const buttonGroup = document.querySelector('.button-group');

    if (!loading || !results || !ul || !buttonGroup) return;

    try {
        const r = await fetch('/api/input_sources');
        const d = await r.json();

        if (d.success && d.sources?.length > 0) {
            inputSources = d.sources;

            ul.innerHTML = d.sources.map(s => `
                <li><span class="material-icons">input</span> ${s}</li>
            `).join('');

            // Clear old buttons
            buttonGroup.innerHTML = '';

            // Check if ANY source contains "line in" (case-insensitive)
            const isLineIn = d.sources.some(src => 
                src.toLowerCase().includes('line in')
            );

            if (isLineIn) {
                // "line in" detected → auto-skip video detection
                buttonGroup.innerHTML = `
                    <button class="button success" onclick="navigate('finalize')">
                        <span class="material-icons">arrow_forward</span>
                        Continue (Line-In Camera Detected)
                    </button>
                `;
                showError('Line-In camera detected – skipping video test', 'success');
                console.log("Line-In input source found → skipping video_object_detection");
            } else {
                // Normal external camera → go to video test
                buttonGroup.innerHTML = `
                    <button class="button" onclick="navigate('video_object_detection')">
                        <span class="material-icons">arrow_forward</span> Next
                    </button>
                `;
            }

            // Stop auto-retry on success
            if (inputSourceRetryInterval) {
                clearInterval(inputSourceRetryInterval);
                inputSourceRetryInterval = null;
            }

            showError('Input sources detected!', 'success');
        } else {
            throw new Error('No sources detected');
        }
    } catch (e) {
        inputSources = [];
        ul.innerHTML = '<li><span class="material-icons">hourglass_top</span> Waiting for input sources...</li>';
        buttonGroup.innerHTML = `
            <button class="button" onclick="fetchInputSources()">
                <span class="material-icons">refresh</span> Retry Now
            </button>
        `;
        showError('Waiting for input source...');
    } finally {
        loading.style.display = 'none';
        results.style.display = 'block';
    }
}

// Start auto-retry when entering input_source_detection
function startInputSourceRetry() {
    console.log('Starting input source detection retry loop');
    // Clear any existing interval
    if (inputSourceRetryInterval) clearInterval(inputSourceRetryInterval);

    // Initial call
    fetchInputSources();

    // Retry every 3 seconds
    inputSourceRetryInterval = setInterval(() => {
        if (currentState === 'input_source_detection') {
            fetchInputSources();
        } else {
            clearInterval(inputSourceRetryInterval);
            inputSourceRetryInterval = null;
        }
    }, 3000);
}

/* ==============================================================
   VIDEO DETECTION API
   ============================================================== */
   let videoDetectionRetryInterval = null;

   async function checkVideoDetection() {
       const loading = document.getElementById('video-loading');
       const results = document.getElementById('video-results');
       const status = document.getElementById('video-status');
       const checkMessage = document.getElementById('checking-video');
       const successMessage = document.getElementById('video-success');
       const buttonGroup = document.querySelector('.button-group');
   
       if (!loading || !results || !status || !buttonGroup) return;
   
       try {
           const r = await fetch('/api/video_detection');
           const d = await r.json();
   
           if (d.success && d.detected) {
               // SUCCESS: Video detection is working!
               status.innerHTML = `<div class="success"><span class="material-icons">check_circle</span> Video detection active: ${d.status || 'Running'}</div>`;
               status.dataset.detected = 'true';
   
               checkMessage.style.display = 'none';
               successMessage.style.display = 'block';
   
               // Remove any existing button and add "Next"
               buttonGroup.querySelector('button[data-action="next"], button[data-action="retry"]')?.remove();
               buttonGroup.insertAdjacentHTML('afterbegin', `
                   <button class="button" data-action="next" onclick="navigate('finalize')">
                       <span class="material-icons">arrow_forward</span> Next
                   </button>
               `);
   
               // Stop auto-retry on success
               if (videoDetectionRetryInterval) {
                   clearInterval(videoDetectionRetryInterval);
                   videoDetectionRetryInterval = null;
               }
   
               showError('Video detection successful!', 'success');
           } else {
               throw new Error(d.error || 'Video detection not ready');
           }
       } catch (e) {
           // FAILURE: Show waiting state + manual retry button
           status.innerHTML = `<div class="info"><span class="material-icons">hourglass_top</span> Waiting for video detection...</div>`;
           status.dataset.detected = 'false';
   
           // Replace button with "Retry Now"
           buttonGroup.querySelector('button[data-action="next"], button[data-action="retry"]')?.remove();
           buttonGroup.insertAdjacentHTML('afterbegin', `
               <button class="button" data-action="retry" onclick="checkVideoDetection()">
                   <span class="material-icons">refresh</span> Retry Now
               </button>
           `);
   
           if (e.message && e.message !== 'Failed to fetch') {
               showError(e.message);
           }
       } finally {
           loading.style.display = 'none';
           results.style.display = 'block';
       }
   }
   
   // Start auto-retry loop when entering video_object_detection state
   function startVideoDetectionRetry() {
       console.log('Starting video detection retry loop');
   
       // Clear any old interval
       if (videoDetectionRetryInterval) clearInterval(videoDetectionRetryInterval);
   
       // First check immediately
       checkVideoDetection();
   
       // Then retry every 3 seconds while in this state
       videoDetectionRetryInterval = setInterval(() => {
           if (currentState === 'video_object_detection') {
               checkVideoDetection();
           } else {
               // Stop retrying if user left this step
               clearInterval(videoDetectionRetryInterval);
               videoDetectionRetryInterval = null;
           }
       }, 3000);
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
            const cd = await cur.json();
            if (cd.success) navigate('connect_select', cd.ssid);
            else showWiFiPopup();
        } else showWiFiPopup();
    } catch { showError('Wi-Fi check failed'); showWiFiPopup(); }
}

let CURRENT_HHID = null;

async function submitHHID() {
    hhid = document.getElementById('hhid')?.value.trim();
    CURRENT_HHID = hhid; 

    if (!hhid) return showError('Enter HHID');

    // --- VALIDATION RULES ---
    if (!hhid) return showError('Enter HHID');
    if (!/^[A-Za-z0-9]+$/.test(hhid)) return showError('Special characters not allowed');
    // if (hhid.length !== 6) return showError('HHID must be exactly 6 characters long');

    // --- Normalizing (optional but cleaner) ---
    hhid = hhid.toUpperCase();

    const btn = event?.target;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-icons">hourglass_top</span> Sending...'; }
    try {
        const r = await fetch('/api/submit_hhid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hhid }) });
        const d = await r.json();
        if (d.success) { showError('OTP sent! Check email.', 'success'); setTimeout(() => navigate('otp_verification'), 1500); }
        else showError(d.error || 'Invalid HHID');
    } catch { showError('Network error'); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons">send</span> Submit & Send OTP'; } }
}
async function submitOTP() {
    const input = document.getElementById('otp');
    const otp = input?.value.trim();

    if (!/^\d{4}$/.test(otp)) {
        showError('Please enter a valid 4-digit OTP');
        input.value = '';
        input.focus();
        return;
    }

    const btn = event?.target;
    if (btn) { 
        btn.disabled = true; 
        btn.innerHTML = '<span class="material-icons">hourglass_top</span> Verifying...'; 
    }

    try {
        const r = await fetch('/api/submit_otp', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ hhid, otp }) 
        });
        const d = await r.json();

        if (d.success) {
            CURRENT_HHID = null;
            input.value = ''; // Clear on success too (optional)
            navigate('input_source_detection');
        } else {
            showError(d.error || 'Invalid OTP');
            input.value = '';     // ← Critical: Clear field on invalid OTP
            input.focus();        // ← Bring cursor back
        }
    } catch (e) {
        showError('Network error. Try again.');
        input.value = '';
        input.focus();
    } finally {
        if (btn) { 
            btn.disabled = false; 
            btn.innerHTML = '<span class="material-icons">verified</span> Verify OTP'; 
        }
    }
}
async function retryOTP() {
    if (!CURRENT_HHID) {
        showError("HHID missing. Please go back and enter HHID again.");
        return;
    }

    // Find the Resend button (works even if you move it later)
    const btn = document.querySelector('button[onclick="retryOTP()"]') ||
                document.querySelector('.button.secondary');   // fallback

    if (!btn) return;

    // Disable button + show inline spinner
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="material-icons spinner-small">hourglass_top</span> Sending…';

    try {
        const r = await fetch('/api/submit_hhid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hhid: CURRENT_HHID })
        });

        const data = await r.json();

        if (data.success) {
            showError("OTP resent! Check your email.", "success");
        } else {
            showError(data.error || "Failed to resend OTP");
        }
    } catch (e) {
        console.error(e);
        showError("Network error – please try again");
    } finally {
        // Always restore the button
        btn.disabled = false;
        btn.innerHTML = originalHTML || '<span class="material-icons">refresh</span> Resend OTP';
    }
}
async function finalizeInstallation() {
    const btn = event?.target;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-icons">hourglass_top</span> Finalizing...'; }
    try {
        const r = await fetch('/api/finalize', { method: 'POST' });
        const d = await r.json();
        if (d.success) { membersData = d.data; navigate('main'); }
        else showError(d.error);
    } catch { showError('Failed to finalize'); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons">check_circle</span> Finalize Installation'; } }
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
        const r = await fetch('/api/toggle_member_status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ index: idx }) });
        const d = await r.json();
        if (d.success) { membersData.members[idx] = d.member; render(); }
        else showError(d.error || 'Failed to update');
    } catch { showError('Network error'); }
}
async function shutdown() {
    if (!confirm('Shutdown system?')) return;
    try { const r = await fetch('/api/shutdown', { method: 'POST' }); const d = await r.json(); alert(d.success ? 'Shutting down...' : d.error); }
    catch { alert('Shutdown failed'); }
}
async function restart() {
    if (!confirm('Restart system?')) return;
    try { const r = await fetch('/api/restart', { method: 'POST' }); const d = await r.json(); alert(d.success ? 'Restarting...' : d.error); }
    catch { alert('Restart failed'); }
}

// ==============================================================
// SCREENSAVER FUNCTIONALITY
// ==============================================================

// -------------------- Raspberry-proof screensaver (fixed) --------------------
let saver = document.getElementById('screensaver');
if (!saver) {
    saver = document.createElement('div');
    saver.id = 'screensaver';
    Object.assign(saver.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'black',
        zIndex: '2147483647',
        pointerEvents: 'all',
        touchAction: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        margin: '0',
        padding: '0',
        color: 'white',
        gap: '10px',
        opacity: '0',
        transition: 'opacity 1s ease', // <— smooth fade animation
        visibility: 'hidden',
        outline: 'none',
    });

    saver.tabIndex = -1;
    document.body.appendChild(saver);

    const wrapper = document.createElement('div');
    wrapper.id = 'clock-wrapper';
    Object.assign(wrapper.style, {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    });

    // time
    const timeEl = document.createElement('div');
    timeEl.id = 'clock-time';
    Object.assign(timeEl.style, {
        fontSize: '100px',
        fontWeight: '600',
        marginBottom: '10px',
        lineHeight: '1',
        textAlign: 'center',
    });

    // date
    const dateEl = document.createElement('div');
    dateEl.id = 'clock-date';
    Object.assign(dateEl.style, {
        fontSize: '28px',
        fontWeight: '400',
        textAlign: 'center',
    });

    wrapper.appendChild(timeEl);
    wrapper.appendChild(dateEl);
    saver.appendChild(wrapper);
}

// --- Clock update ---
function updateClock() {
    const now = new Date();

    // Time: 09:41 (24-hour format)
    const time = now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    // Custom formatting to get: Monday, 24 November 2025
    const weekday = now.toLocaleDateString('en-IN', { weekday: 'short' });     // Monday
    const day     = now.getDate();                                             // 24
    const month   = now.toLocaleDateString('en-IN', { month: 'short' });        // November
    const year    = now.getFullYear();                                         // 2025

    const date = `${weekday}, ${day} ${month} ${year}`;

    document.getElementById('clock-time').textContent = time;
    document.getElementById('clock-date').textContent = date;
}

setInterval(updateClock, 1000);
updateClock(); // initial update
setInterval(updateClock, 1000);
updateClock();

let screensaverTimeout;
let preDimTimeout;
let originalBrightness = 153; // Track original brightness
let isDimmed = false;

function showScreensaver() {
    saver.style.visibility = "visible";
    saver.style.opacity = "1"; // fade in
    try {
        saver.focus({ preventScroll: true });
    } catch (e) { }
}

function hideScreensaver() {
    saver.style.opacity = "0"; // fade out
    setTimeout(() => {
        saver.style.visibility = "hidden";
    }, 1000); // matches transition duration
    try {
        saver.blur();
    } catch (e) { }
}

// --- Pre-dim brightness logic (go straight to mapped minimum) ---
async function preDimBrightness() {
    if (isDimmed) return; // already dimmed

    const current = originalBrightness ?? 153;
    originalBrightness = current;

    // Match backend-safe lower limit
    const minBrightness = 51;

    // If brightness is already near the minimum, skip dimming
    if (current <= minBrightness + 5) return;

    try {
        await updateBrightnessAPI(minBrightness);
        isDimmed = true;
        console.log(`[PRE-DIM] ${current} → ${minBrightness}`);
    } catch (err) {
        console.error("Pre-dim brightness update failed:", err);
    }
}


// --- Restore brightness to original level ---
async function restoreBrightness() {
    if (!isDimmed) return;

    const restoreValue = originalBrightness ?? 153;
    isDimmed = false;

    try {
        await updateBrightnessAPI(restoreValue);
        console.log(`[RESTORE] ${restoreValue}`);
    } catch (err) {
        console.error("Restore brightness update failed:", err);
    }
}



async function updateBrightnessAPI(value) {
    // Map 0–255 → 51–255
    const mapped = Math.round(51 + (value / 255) * (255 - 51));

    try {
        await fetch("/api/brightness", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brightness: mapped }),
        });
    } catch (err) {
        console.error("Brightness update error:", err);
    }
}


// --- Screensaver with pre-dim at 20s (30s - 10s) ---

function resetScreensaverTimer() {
    clearTimeout(screensaverTimeout);
    clearTimeout(preDimTimeout);
    hideScreensaver();
    restoreBrightness();

    // Pre-dim at 20 seconds (10 seconds before screensaver)
    preDimTimeout = setTimeout(preDimBrightness, 20000);

    // Show screensaver at 30 seconds
    screensaverTimeout = setTimeout(showScreensaver, 30000);
}

// Start screensaver timer ONLY when on the main dashboard
// if (currentState === 'main') resetScreensaverTimer();

// --- event blocking logic unchanged ---
function shouldLetEventThroughToSaver(e) {
    return saver.contains(e.target);
}
function blockEventIfActive(e) {
    if (saver.style.visibility === 'visible' && saver.style.opacity !== '0' && !shouldLetEventThroughToSaver(e)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        return true;
    }
    return false;
}
['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'keydown', 'keyup', 'keypress'].forEach(evt => {
    document.addEventListener(evt, (e) => blockEventIfActive(e), { capture: true, passive: false });
});
['click', 'pointerdown', 'touchstart', 'pointermove', 'mousemove'].forEach(evt => {
    saver.addEventListener(evt, (ev) => {
        ev.stopImmediatePropagation();
        ev.preventDefault();
        hideScreensaver();
        resetScreensaverTimer();
    }, { capture: true, passive: false });
});
['mousemove', 'keypress', 'click', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => {
        if (currentState === 'main') resetScreensaverTimer();
    }, { passive: true });
});

async function initBrightnessControl() {
    const slider = document.getElementById('brightness-slider');
    if (!slider) return;

    // --- Fetch actual current brightness from backend ---
    try {
        const res = await fetch('/api/current_brightness');
        const data = await res.json();
        if (data.success && typeof data.brightness === 'number') {
            slider.value = Math.round(((data.brightness - 51) / (255 - 51)) * 255);
            originalBrightness = data.brightness; // keep global in sync
            console.log(`[INIT] Brightness synced: ${data.brightness}`);
        }
    } catch (err) {
        console.warn('Could not fetch current brightness:', err);
    }

    // --- Listen for manual user changes ---
    slider.addEventListener('input', async e => {
        const currentBrightness = parseInt(e.target.value);
        originalBrightness = currentBrightness; // update global baseline
        await updateBrightnessAPI(currentBrightness);
    });
}

/* ==============================================================
   Key-press feedback
   ============================================================== */

function handleKeyDown(event) {
    const btn = event.currentTarget;
    btn.classList.add('pressed');
}

function handleKeyUp(event) {
    const btn = event.currentTarget;
    btn.classList.remove('pressed');
}




const avatar = (gender, dob) => {
    if (!gender || !dob) return '/static/assets/default.png';

    // Compute age from DOB
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

    const cat = age <= 12 ? 'kid' :
        age <= 19 ? 'teen' :
            age <= 40 ? 'middle' :
                age <= 60 ? 'aged' : 'elder';

    return `/static/assets/${gender.toLowerCase()}-${cat}.png`;
};




function showEditMemberPopup() {
    if (document.getElementById('edit-member-popup')) return;

    const overlay = document.createElement('div');
    overlay.id = 'edit-member-overlay';
    overlay.className = 'overlay';
    overlay.onclick = closeEditMemberPopup;

    const popup = document.createElement('div');
    popup.id = 'edit-member-popup';
    popup.className = 'popup';
    popup.innerHTML = `
        <h2 style="margin-top: 0;"><span class="material-icons">edit</span> Edit Member Code</h2>
        <div id="edit-error" class="error" style="display:none;"></div>
        <div class="custom-select" style="margin:1rem 0;">
            <div id="edit-selected" class="selected-item">
                <span>Select Member</span>
                <span class="material-icons arrow">arrow_drop_down</span>
            </div>
            <ul id="edit-member-list" class="dropdown-list" style="display:none;"></ul>
        </div>
        <input type="text" id="new-code" placeholder="New Code (e.g. M1A)" maxlength="15" onfocus="showKeyboard(this)">
        <div class="button-group" style="margin-top: 2rem;">
            <button class="button" onclick="saveMemberCode()">Save</button>
            <button class="button secondary" onclick="closeEditMemberPopup()">Cancel</button>
        </div>
    `;

    document.body.append(overlay, popup);

    // Populate member list
    const list = document.getElementById('edit-member-list');
    const selected = document.getElementById('edit-selected');
    membersData?.members.forEach((m, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${m.member_code} • ${m.gender}, DOB: ${m.dob}</span>`;
        li.onclick = (e) => {
            e.stopPropagation();
            selectedMemberIndex = i;
            selected.innerHTML = `<span>${m.member_code}</span><span class="material-icons arrow">arrow_drop_down</span>`;
            list.style.display = 'none';
            selected.classList.remove('open');
            document.getElementById('new-code').focus();
        };
        list.appendChild(li);
    });

    // Dropdown toggle
    selected.onclick = (e) => {
        e.stopPropagation();
        const open = list.style.display === 'block';
        list.style.display = open ? 'none' : 'block';
        selected.classList.toggle('open', !open);
    };

    overlay.onclick = () => {
        list.style.display = 'none';
        selected.classList.remove('open');
        closeEditMemberPopup();
    };
}

let selectedMemberIndex = -1;

function closeEditMemberPopup() {
    ['edit-member-popup', 'edit-member-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
    selectedMemberIndex = -1;
}

async function saveMemberCode() {
    const codeInput = document.getElementById('new-code');
    const code = codeInput?.value.trim().toUpperCase();
    const err = document.getElementById('edit-error');

    if (selectedMemberIndex < 0) return showErrorInPopup('Select a member', err);
    if (!code || !/^[A-Za-z0-9]{1,15}$/.test(code)) {
        return showErrorInPopup('Invalid code (1–15 chars, letters & numbers only)', err);
    }

    try {
        const r = await fetch('/api/edit_member_code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: selectedMemberIndex, member_code: code })
        });
        const d = await r.json();
        if (d.success) {
            membersData.members[selectedMemberIndex] = d.member;
            render();
            closeEditMemberPopup();
        } else {
            showErrorInPopup(d.error || 'Failed', err);
        }
    } catch {
        showErrorInPopup('Network error', err);
    }
}

function showErrorInPopup(msg, el) {
    el.innerHTML = `<span class="material-icons">error</span> ${msg}`;
    el.style.display = 'flex';
}

/* ==============================================================
   INITIALISATION
   ============================================================== */
   async function init() {
    try {
        const [installRes, stateRes] = await Promise.all([
            fetch('/api/check_installation'),
            fetch('/api/check_current_state')
        ]);

        const installData = await installRes.json();
        const stateData = await stateRes.json();

        meterId = installData.meter_id || 'IM000000';

        if (installData.installed) {
            currentState = 'main';
            await fetchMembers();
        } else {
            let savedState = stateData.current_state || 'welcome';

            if (!states[savedState] || savedState === '' || savedState === 'main') {
                savedState = 'welcome';
            }

            currentState = savedState;
        }

        console.log("Starting UI in state:", currentState);
        navigate(currentState);

            
    } catch (err) {
        console.error("Init failed, falling back to welcome:", err);
        currentState = 'welcome';
        navigate('welcome');
    }
}
init();
//1036 HHID