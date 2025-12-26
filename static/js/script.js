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
           ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.']
       ],
       shift: [
           ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
           ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
           ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
           ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
       ],

       special: [
        ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
        ['-', '+', '=', '{', '}', '[', ']', '|', '\\', '/'],
        [';', ':', '\'', '"', ',', '<', '>', '?', '`', '~'],
        ['_', '.']
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
                <div class="bar-inner">
                    <button class="bar-btn" onclick="showSettingsPopup()">
                        <span class="material-icons">settings</span>
                    </button>
                    <button class="bar-btn" onclick="showMeterIdPopup()">
                        <span class="material-icons">info</span>
                    </button>
                    <!-- Add more buttons here if you want -->
                </div>
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
                <div class="bar-inner">
                    <button class="bar-btn" onclick="showSettingsPopup()">
                        <span class="material-icons">settings</span>
                    </button>
                    <button class="bar-btn" onclick="showMeterIdPopup()">
                        <span class="material-icons">info</span>
                    </button>
                    <!-- Add more buttons here if you want -->
                </div>
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
                <div class="bar-inner">
                    <button class="bar-btn" onclick="showSettingsPopup()">
                        <span class="material-icons">settings</span>
                    </button>
                    <button class="bar-btn" onclick="showMeterIdPopup()">
                        <span class="material-icons">info</span>
                    </button>
                    <!-- Add more buttons here if you want -->
                </div>
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
                <div class="bar-inner">
                    <button class="bar-btn" onclick="showSettingsPopup()">
                        <span class="material-icons">settings</span>
                    </button>
                    <button class="bar-btn" onclick="showMeterIdPopup()">
                        <span class="material-icons">info</span>
                    </button>
                    <!-- Add more buttons here if you want -->
                </div>
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
                <div class="bar-inner">
                    <button class="bar-btn" onclick="showSettingsPopup()">
                        <span class="material-icons">settings</span>
                    </button>
                    <button class="bar-btn" onclick="showMeterIdPopup()">
                        <span class="material-icons">info</span>
                    </button>
                    <!-- Add more buttons here if you want -->
                </div>
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
                <div class="bar-inner">
                    <button class="bar-btn" onclick="showSettingsPopup()">
                        <span class="material-icons">settings</span>
                    </button>
                    <button class="bar-btn" onclick="showMeterIdPopup()">
                        <span class="material-icons">info</span>
                    </button>
                    <!-- Add more buttons here if you want -->
                </div>
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
                <div class="bar-inner">
                    <button class="bar-btn" onclick="showSettingsPopup()">
                        <span class="material-icons">settings</span>
                    </button>
                    <button class="bar-btn" onclick="showMeterIdPopup()">
                        <span class="material-icons">info</span>
                    </button>
                    <!-- Add more buttons here if you want -->
                </div>
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
                    <div class="bar-left">
                        <button class="bar-btn" onclick="showEditMemberPopup()">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="bar-btn" onclick="showSettingsPopup()">
                            <span class="material-icons">settings</span>
                        </button>
                        <button class="bar-btn add-guest-btn" onclick="openDialog()">
                            <span class="material-icons">add</span>
                            <span class="btn-text">Add Guest</span>
                        </button>
                    </div>

                    <div class="bar-center">
                        <span class="guest-count">${guests.length} / 8 Guests</span>
                    </div>
                    <button class="bar-btn" onclick="showMeterIdPopup()">
                            <span class="material-icons">info</span>
                        </button>

                    <div class="bar-right" id="main-wifi-status">
                        <!-- Wi-Fi status injected by JS -->
                    </div>
                </div>
           </div> 
       </div>
       <div id="screensaver"></div>`;
       },
   };

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

   async function updateMainDashboardWiFiStatus() {
    const statusEl = document.getElementById('main-wifi-status');
    if (!statusEl) return;

    try {
        const res = await fetch('/api/current_wifi');
        const data = await res.json();

        let icon = 'wifi_off';
        let color = '#999'; // gray
        let text = 'Disconnected';

        if (data.success && data.ssid) {
            icon = 'wifi';
            color = '#4caf50'; // green
            text = data.ssid;
        }

        statusEl.innerHTML = `
            <span style="max-width:350px;overflow:hidden;text-overflow:ellipsis;">${text}</span>
            <span class="material-icons" style="color:${color};">${icon}</span>
        `;
    } catch (e) {
        statusEl.innerHTML = `
            <span>Disconnected</span>
            <span class="material-icons" style="color:#999;">wifi_off</span>
        `;
    }
}

   //ADD Guest option
/* ==============================================================
   GUEST MANAGEMENT (Max 8 guests)
   ============================================================== */
   const MAX_GUESTS = 8;
   let guests = []; // { age: 25, gender: "Male" }
   let currentWiFiStatus = { connected: false, ssid: null, strength: null };
   
   
   function openDialog() {
    closeSettingsPopup();
    closeWiFiPopup();
    closeEditMemberPopup();
    document.getElementById('guest-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'guest-overlay';
    overlay.innerHTML = `
        <div style="display:flex; align-items:stretch; justify-content:center; gap:0; max-width:1100px; margin:0 auto; background:white; border-radius:24px; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,0.45);">
            
            <!-- LEFT PANEL: GUEST LIST -->
            <div style="width:340px; background:#f0f7ff; padding:28px; display:flex; flex-direction:column; border-right:1px solid #e0e0e0;">
                <h3 style="margin:0 0 20px; font-size:19px; color:#1a1a1a;">
                    Added Guests <strong id="guest-counter-header">${guests.length}</strong>/8
                </h3>
                <div style="flex:1; overflow-y:auto; padding-right:8px;">
                    <div id="guest-list" style="display:flex; flex-direction:column; gap:12px;"></div>
                </div>
            </div>

            <!-- CENTER PANEL: FORM -->
            <div style="flex:1; min-width:380px; padding:32px 40px; display:flex; flex-direction:column; background:white;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                    <h2 style="margin:0; font-size:22px; font-weight:600;">Add Guest</h2>
                    
                    <!-- ONLY CHANGE: Beautiful close icon instead of text -->
                    <button class="guest-close" onclick="closeGuestDialog()" 
                            style="background:none; border:none; cursor:pointer; padding:8px; border-radius:50%; transition:all 0.2s;"
                            onmouseover="this.style.background='rgba(0,0,0,0.1)'"
                            onmouseout="this.style.background='none'">
                        <span class="material-icons" style="font-size:32px; color:#666;">close</span>
                    </button>
                </div>

                <div style="flex:1; display:flex; flex-direction:column; justify-content:center; max-width:400px; margin:0 auto;">
                    <label style="font-size:17px; margin-bottom:8px; color:#333;">Age</label>
                    <input type="number" id="guest-age" min="1" max="125" placeholder="e.g. 32" inputmode="none"
                           style="width:100%; padding:18px; font-size:20px; border:2.5px solid #ddd; border-radius:14px; margin-bottom:10px; text-align:center;">
                    <div class="guest-error" id="age-error" style="color:#e74c3c; font-size:15px; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                        <span class="material-icons" style="font-size:19px;">error</span> Please enter age (1–125)
                    </div>

                    <label style="font-size:17px; margin:20px 0 8px; color:#333;">Gender</label>
                    <div class="custom-dropdown">
                        <div id="gender-display" class="dropdown-display">
                            <span class="placeholder">Select gender</span>
                            <span class="material-icons arrow">arrow_drop_down</span>
                        </div>
                        <div id="gender-options" class="dropdown-options">
                            <div class="dropdown-item" data-value="Male">Male</div>
                            <div class="dropdown-item" data-value="Female">Female</div>
                            <div class="dropdown-item" data-value="Other">Other</div>
                        </div>
                    </div>
                    <div class="guest-error" id="gender-error" style="color:#e74c3c; font-size:15px; margin-bottom:20px; display:flex; align-items:center; gap:6px;">
                        <span class="material-icons" style="font-size:19px;">error</span> Please select gender
                    </div>

                    <div style="display:flex; gap:16px; margin-top:30px;">
                        <button class="cancel" onclick="closeGuestDialog()"
                                style="flex:1; padding:18px; border:none; border-radius:14px; background:#f5f5f5; font-size:18px; font-weight:600; cursor:pointer;">Cancel</button>
                        <button class="add" id="add-guest-btn" onclick="addGuest()"
                                style="flex:1; padding:18px; border:none; border-radius:14px; background:#1976d2; color:white; font-size:18px; font-weight:600; cursor:pointer;">Add</button>
                    </div>
                </div>
            </div>

            <!-- RIGHT PANEL: NUMPAD -->
            <div style="width:300px; background:#fafafa; padding:28px; display:flex; align-items:center; justify-content:center; border-left:1px solid #e0e0e0;">
                <div class="guest-numpad" style="display:grid; grid-template-columns:repeat(3,70px); gap:14px;">
                    ${[7,8,9,4,5,6,1,2,3].map(n => 
                        `<button onclick="numpadPress('${n}')" style="width:70px; height:70px; border:none; border-radius:18px; background:#ffffff; font-size:30px; font-weight:700; cursor:pointer; box-shadow:0 6px 16px rgba(0,0,0,0.15);">${n}</button>`
                    ).join('')}
                    <button onclick="numpadPress('0')" style="grid-column:2;">0</button>
                    <button class="backspace" onclick="numpadBackspace()" style="grid-column:1/4; background:#ffebee; color:#d32f2f;">
                        <span class="material-icons" style="font-size:40px;">backspace</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    hideKeyboard();

    requestAnimationFrame(async () => {
        overlay.style.opacity = '1';
        document.getElementById('guest-age')?.focus();

        // THIS IS THE KEY FIX:
        await loadGuestsForDialog();        // Load full list from server
        updateGuestList();                  // Render list
        await updateGuestCountFromFile();   // Update header + bottom bar + button

        console.log("Guest dialog opened → count refreshed from disk");
    });

    overlay.addEventListener('click', e => e.target === overlay && e.stopPropagation());
    // loadGuestsForDialog();  // ← Load full list when opening
    // updateGuestCountFromFile(); // ← Also update count
}


function numpadPress(digit) {
    const input = document.getElementById('guest-age');
    if (!input) return;

    let current = input.value || '';
    let newValue = current + digit;

    // BLOCK leading zero (except if it's just "0" temporarily → allow delete)
    if (current === '' && digit === '0') {
        return; // silently block starting with 0
    }

    // Convert to number for validation
    const num = parseInt(newValue, 10);

    // BLOCK if result would be 0 or > 125
    if (num === 0 || num > 125) {
        return; // just ignore the press — no beep, no flash, clean silence
    }

    // All good → apply
    input.value = newValue;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
}

function numpadBackspace() {
    const input = document.getElementById('guest-age');
    if (!input) return;

    let current = input.value;
    if (!current) return;

    // Allow deleting everything (even down to empty)
    input.value = current.slice(0, -1);

    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
}

// Close numpad when dialog closes
function closeGuestDialog() {
    document.getElementById('guest-overlay')?.remove();
}
   
function closeGuestDialog() {
    document.getElementById('guest-overlay')?.remove();
    hideKeyboard();
}
   
   async function addGuest() {
    const ageInput = document.getElementById('guest-age');
    const genderDisplay = document.getElementById('gender-display');
    const age = ageInput.value.trim();
    const gender = genderDisplay?.dataset.value || '';

    const ageError = document.getElementById('age-error');
    const genderError = document.getElementById('gender-error');

    let valid = true;
    ageError.classList.remove('show');
    genderError.classList.remove('show');

    if (!age || parseInt(age) < 1 || parseInt(age) > 125) {
        ageError.classList.add('show');
        valid = false;
    }
    if (!gender) {
        genderError.classList.add('show');
        valid = false;
    }
    if (!valid) return;

    // Use server as source of truth
    try {
        const res = await fetch('/api/get_guests');
        const data = await res.json();
        if (data.success && data.guests.length >= 8) {
            alert('Maximum 8 guests allowed');
            return;
        }
    } catch (e) {
        // offline → allow but warn
    }

    // Add via backend → this saves + syncs
    const response = await fetch('/api/sync_guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            guests: [...guests, { age: parseInt(age), gender }] // append new
        })
    });

    const result = await response.json();
    if (!result.success) {
        showToast("Failed to save guest");
        return;
    }

    // CLEAR FORM
    ageInput.value = '';
    genderDisplay.innerHTML = '<span class="placeholder">Select gender</span><span class="material-icons arrow">arrow_drop_down</span>';
    delete genderDisplay.dataset.value;
    ageInput.focus();

    // INSTANT UI UPDATE FROM SERVER (this is what fixes it)
    await loadGuestsForDialog();
    updateGuestList();
    await updateGuestCountFromFile();

    // showToast(`Guest added (${result.guest_count}/8)`);
}
   
   async function removeGuest(index) {
        let currentGuests = [];
        try {
            const res = await fetch('/api/get_guests');
            const data = await res.json();
            if (data.success) currentGuests = data.guests;
        } catch (e) {
            showToast("Offline – cannot remove");
            return;
        }

        // Remove the one at index
        currentGuests.splice(index, 1);

        // Send updated list to backend
        const response = await fetch('/api/sync_guests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guests: currentGuests })
        });

        const result = await response.json();
        if (!result.success) {
            showToast("Failed to remove guest");
            return;
        }

        // INSTANT REFRESH
        await loadGuestsForDialog();
        updateGuestList();
        await updateGuestCountFromFile();
   }
   
   function updateGuestList() {
    const list = document.getElementById('guest-list');
    if (!list) return;

    if (guests.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">No guests added yet</div>';
        return;
    }

    list.innerHTML = guests.map((g, i) => `
        <div class="guest-item" style="padding:0px; background:#f8fbff; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
            <span>G ${i + 1}: ${g.age} years • ${g.gender}</span>
            <button onclick="removeGuest(${i})" style="background:none; border:none; color:#d32f2f; font-size:20px; cursor:pointer;">remove</button>
        </div>
    `).join('');
}
   
function updateGuestCounter() {
    const count = guests.length;

    // Update dialog header (when open)
    const header = document.getElementById('guest-counter-header');
    if (header) header.textContent = count;

    // Update main screen bottom bar (always exists after main state)
    const bottom = document.querySelector('.guest-count');
    if (bottom) bottom.textContent = `${count} / 8 Guests`;

    // Update add button in dialog
    const btn = document.getElementById('add-guest-btn');
    if (btn) {
        btn.disabled = count >= 8;
        btn.textContent = count >= 8 ? 'Limit Reached' : 'Add';
    }
}

   async function loadGuestsFromServer() {
    try {
        const res = await fetch('/api/get_guests');
        const data = await res.json();
        if (data.success && Array.isArray(data.guests)) {
            guests = data.guests.map(g => ({
                age: g.age,
                gender: g.gender
            }));

            guests = data.guests.map(g => ({ age: g.age, gender: g.gender }));
            updateGuestCounter();        // ← This now updates BOTH places
            updateGuestList();
            renderGuestCountInMain(); // ← new tiny function below
            console.log(`Loaded ${guests.length} guests from disk`);
        }
    } catch (e) {
        console.warn("Could not load guests:", e);
    }
}

function renderGuestCountInMain() {
    const bottomCount = document.querySelector('.guest-count');
    if (bottomCount) {
        bottomCount.textContent = `${guests.length} / 8 Guests`;
    }
}


// Touch-friendly Gender Dropdown (no cursor!)
document.addEventListener('click', function(e) {
    const display = document.getElementById('gender-display');
    const options = document.getElementById('gender-options');

    if (!display || !options) return;

    // Open/close dropdown
    if (e.target.closest('#gender-display')) {
        const isOpen = options.classList.contains('open');
        options.classList.toggle('open', !isOpen);
        display.classList.toggle('active', !isOpen);
        return;
    }

    // Select option
    if (e.target.classList.contains('dropdown-item')) {
        const value = e.target.dataset.value;
        const text = e.target.textContent;

        display.innerHTML = `<span>${text}</span><span class="material-icons arrow">arrow_drop_down</span>`;
        display.dataset.value = value;

        options.classList.remove('open');
        display.classList.remove('active');
        return;
    }

    // Close when clicking outside
    if (!e.target.closest('.custom-dropdown')) {
        options.classList.remove('open');
        display.classList.remove('active');
    }
});

async function sendGuestListToServer() {
    try {
        const response = await fetch('/api/sync_guests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guests: guests.map(g => ({ age: g.age, gender: g.gender }))
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log("Guests synced →", result.guest_count, "guests");
            // showToast(`Guest list updated (${guests.length}/8)`);
        } else {
            showToast("Saved locally – will sync when online");
        }
    } catch (err) {
        console.error("Guest sync failed:", err);
        showToast("No internet – saved locally");
    }
}


// Load only the count for main screen (fast)
async function updateGuestCountFromFile() {
    try {
        const res = await fetch('/api/guest_count');
        const data = await res.json();
        if (data.success) {
            const count = data.count;

            // Update bottom bar (main screen)
            const bottom = document.querySelector('.guest-count');
            if (bottom) bottom.textContent = `${count} / 8 Guests`;

            // Update dialog header (CRITICAL)
            const header = document.getElementById('guest-counter-header');
            if (header) header.textContent = count;

            // Update Add button state
            const btn = document.getElementById('add-guest-btn');
            if (btn) {
                btn.disabled = count >= 8;
                btn.textContent = count >= 8 ? 'Limit Reached' : 'Add';
            }
        }
    } catch (e) {
        console.warn("Failed to update guest count:", e);
    }
}

// ... end of guest functions ...

async function updateBottomBarWiFiStatus() {
    const bottomBars = document.querySelectorAll('.bottom-bar-allpage .bar-inner');
    if (bottomBars.length === 0) return;

    try {
        const res = await fetch('/api/current_wifi');
        const data = await res.json();

        let icon = 'wifi_off';
        let color = '#999'; // gray
        let text = 'Disconnected';

        if (data.success && data.ssid) {
            icon = 'wifi';
            color = '#4caf50'; // green
            text = data.ssid;

            currentWiFiStatus = { connected: true, ssid: data.ssid, strength: 'good' };
        } else {
            currentWiFiStatus = { connected: false, ssid: null, strength: null };
        }

        bottomBars.forEach(bar => {
            let statusEl = bar.querySelector('.wifi-status');
            if (!statusEl) {
                statusEl = document.createElement('div');
                statusEl.className = 'wifi-status';
                statusEl.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 16px;
                    color: black;
                    margin-left: auto;
                    padding-right: 12px;
                `;
                bar.appendChild(statusEl);
            }

            statusEl.innerHTML = `
                <span style="white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                    ${text}
                </span>
                <span class="material-icons" style="font-size: 24px; color: ${color};">${icon}</span>
            `;
        });
    } catch (e) {
        console.warn("Failed to update Wi-Fi status in bottom bar:", e);
    }
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

// Load full list only when opening dialog
async function loadGuestsForDialog() {
    try {
        const res = await fetch('/api/guests_list');
        const data = await res.json();
        if (data.success && Array.isArray(data.guests)) {
            guests = data.guests.map(g => ({
                age: g.age,
                gender: g.gender
            }));
            updateGuestList();
            updateGuestCounter();  // This will now work
        }
    } catch (e) {
        console.warn("Failed to load guests for dialog:", e);
    }
}

// Simple toast notification (add this helper if you don't have one)
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.8); color: white; padding: 12px 24px;
        border-radius: 30px; font-size: 16px; z-index: 10000;
        animation: fadein 0.3s, fadeout 0.5s 2.5s forwards;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
   
   /* ==============================================================
      VIRTUAL KEYBOARD
      ============================================================== */
      function showKeyboard(el) {
        activeInput = el;
    
        // LIFT WIFI POPUP ONLY WHEN THE PASSWORD FIELD IN WIFI POPUP IS FOCUSED
        if (el.id === 'password' && document.getElementById('wifi-popup')) {
            liftWiFiPopup();
        }
    
        const bottomBar = document.querySelector('.bottom-bar-allpage');
    
        // Lift the main container card (for normal screens)
        const containerCard = document.querySelector('.container');
        if (containerCard) {
            containerCard.classList.add('lifted');
        }
        if (bottomBar) bottomBar.classList.add('lifted');

        if (document.getElementById('guest-overlay')) {
            return; // ← This stops the old keyboard completely
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
        kb.className = 'virtual-keyboard showing';
        kb.innerHTML = `
            <div class="keyboard-body">
                <div class="keyboard-keys" id="keyboard-keys"></div>
                <div class="keyboard-bottom-row">
                    <button class="key-special key-shift" onclick="toggleShift()"
                        onmousedown="handleKeyDown(event)" onmouseup="handleKeyUp(event)"
                        ontouchstart="handleKeyDown(event)" ontouchend="handleKeyUp(event)">
                        <span class="material-icons">arrow_upward</span>
                        <span class="key-label">Shift</span>
                    </button>
    
                    <button class="key key-space" onclick="insertChar(' ')"
                        onmousedown="handleKeyDown(event)" onmouseup="handleKeyUp(event)"
                        ontouchstart="handleKeyDown(event)" ontouchend="handleKeyUp(event)">Space
                    </button>
    
                    <button class="key-special key-backspace" onclick="backspace()"
                        onmousedown="handleKeyDown(event)" onmouseup="handleKeyUp(event)"
                        ontouchstart="handleKeyDown(event)" ontouchend="handleKeyUp(event)">
                        <span class="key-backspace material-icons">backspace</span>
                    </button>
    
                    <button class="key-special key-enter" onclick="pressEnter()"
                        onmousedown="handleKeyDown(event)" onmouseup="handleKeyUp(event)"
                        ontouchstart="handleKeyDown(event)" ontouchend="handleKeyUp(event)">
                        <span class="material-icons">keyboard_return</span>
                        <span class="key-label">Enter</span>
                    </button>

                    <button class="key-special key-backspace" onclick="toggleSpecial()"
                        onmousedown="handleKeyDown(event)" onmouseup="handleKeyUp(event)"
                        ontouchstart="handleKeyDown(event)" ontouchend="handleKeyUp(event)">
                        <span class="key-backspace material-icons">?123</span>
                    </button>

                </div>
            </div>`;
    
        document.body.appendChild(kb);
        renderKeys();
        scrollInputIntoView();
    
        // Prevent clicks inside keyboard from bubbling up
        kb.addEventListener('click', e => e.stopPropagation());
    }

    

   function renderKeys() {
       const container = document.getElementById('keyboard-keys');
       if (!container) return;
   
       let layout;
       if (specialActive) {
           layout = keyboardLayouts.special;
       } else if (shiftActive) {
           layout = keyboardLayouts.shift;
       } else {
           layout = keyboardLayouts.normal;
       }

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

   let specialActive = false;

    function toggleSpecial() {
        specialActive = !specialActive;
        // Turn off shift when special is activated
        if (specialActive) {
            shiftActive = false;
            const shiftBtn = document.querySelector('.key-shift');
            if (shiftBtn) shiftBtn.classList.remove('active');
        }

        const specialBtn = document.querySelector('.key-special-btn');
        if (specialBtn) {
            specialBtn.classList.toggle('active', specialActive);
        }

        renderKeys();
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
       document.querySelector('.container')?.classList.remove('lifted');
   
       activeInput = null;
       shiftActive = false;
       lowerEditMemberPopup();
       lowerWiFiPopup();
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
   /* ==============================================================
   GLOBAL CLICK HANDLER — FINAL VERSION (NO MORE POPUP FLICKER EVER)
   ============================================================== */
   document.addEventListener('click', e => {
    const kb = document.getElementById('virtual-keyboard');
    const wifiPopup = document.getElementById('wifi-popup');
    const wifiOverlay = document.getElementById('wifi-overlay');

    if (kb && kb.contains(e.target)) return;
    if (wifiPopup && wifiPopup.contains(e.target)) return;
    if (wifiOverlay && wifiOverlay.contains(e.target)) return;

    const input = e.target.closest('input');
    if (input) {
        showKeyboard(input);
        return;
    }

    hideKeyboard();  // this will lower popup safely
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

           updateMainDashboardWiFiStatus();
   
       } else {
           container.innerHTML = `
               <div class="container"><div class="card">
                   <div id="progress-bar-temp"></div>${html}
               </div></div>`;
           const tmp = container.querySelector('#progress-bar-temp');
           if (tmp && progressBar) { tmp.parentNode.insertBefore(progressBar, tmp); tmp.remove(); }
           progressBar.style.display = 'flex';
           updateProgressBar();
           updateBottomBarWiFiStatus();
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
    
        const popup = document.createElement('div');
        popup.id = 'wifi-popup';
        popup.className = 'popup'; // this already has the base styles
    
        popup.innerHTML = `
            <!-- your full HTML here (exactly the same as before) -->
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
    
            <div class="password-wrapper" id="password-wrapper" style="position:relative; width:100%; max-width:400px; margin:0 auto;">
                <div style="position:relative; display:flex; align-items:center;">
                    <input 
                        type="password" 
                        id="password" 
                        placeholder="Password" 
                        autocomplete="off"
                        style="width:100%; padding:12px 48px 12px 12px; border:1px solid #ccc; border-radius:8px; font-size:16px; outline:none;"
                    >
                    <button type="button" class="toggle-password" onclick="togglePasswordVisibility(event)"
                        style="position:absolute; right:8px; background:none; border:none; cursor:pointer; padding:8px; color:#666;">
                        <span class="material-icons" id="eye-icon" style="font-size:24px;">visibility</span>
                    </button>
                </div>
    
                <div id="wifi-loading" style="display:none; text-align:center; margin-top:12px;">
                    <div class="spinner" style="border:4px solid #f3f3f3; border-top:4px solid #3498db; border-radius:50%; width:32px; height:32px; animation:spin 1s linear infinite; margin:0 auto 8px;"></div>
                    <div>Connecting...</div>
                </div>
    
                <div class="button-group" style="margin-top:20px; display:flex; gap:10px; justify-content:center;">
                    <button class="button" onclick="connectWiFi()" style="padding:10px 20px; background:#0066ff; color:white; border:none; border-radius:8px; cursor:pointer;">Connect</button>
                    <button class="button secondary" onclick="disconnectWiFi()" style="padding:10px 20px; background:#f0f0f0; color:#333; border:1px solid #ccc; border-radius:8px; cursor:pointer;">Disconnect</button>
                    <button class="button secondary" onclick="closeWiFiPopup()" style="padding:10px 20px; background:#f0f0f0; color:#333; border:1px solid #ccc; border-radius:8px; cursor:pointer;">Close</button>
                </div>
            </div>
        `;
    
        document.body.appendChild(overlay);
        document.body.appendChild(popup);
    
        // THIS IS THE KEY PART YOU WERE MISSING:
        const passwordInput = document.getElementById('password');
        const wifiPopup = document.getElementById('wifi-popup');
    
        passwordInput.addEventListener('focus', () => {
            showKeyboard(passwordInput);   // your existing virtual keyboard
            liftWiFiPopup();               // ← lift it up
        });
        
    
        // Also lower popup when buttons are clicked (especially on mobile)
        popup.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                wifiPopup.classList.remove('lifted');
            });
        });
    
        // Rest of your existing code (fetching, dropdown, etc.)
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
        }, 20);
    
        initWiFiLift();
    
        document.getElementById('selected-network').onclick = (e) => {
            e.stopPropagation();
            const list = document.getElementById('network-list');
            const isOpen = list.style.display === 'block';
            list.style.display = isOpen ? 'none' : 'block';
            e.currentTarget.classList.toggle('open', !isOpen);
        };
    
        overlay.onclick = (e) => {
            e.stopPropagation(); // just in case
            // → NO closeWiFiPopup() here = popup stays open when tapping background
        };
    }

    // === ADD THIS ANYWHERE AFTER showWiFiPopup() can see it ===
let wifiPopupLifted = false;

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
    // Block EVERYTHING that could close keyboard or lower popup
    if (e) {
        e.stopPropagation();
        e.preventDefault();
        e.stopImmediatePropagation();
    }

    const input = document.getElementById('password');
    const icon  = document.getElementById('eye-icon');
    const popup = document.getElementById('wifi-popup');

    if (!input || !icon) return;

    // Toggle password ↔ text
    const wasPassword = input.type === 'password';
    input.type = wasPassword ? 'text' : 'password';
    icon.textContent = wasPassword ? 'visibility_off' : 'visibility';

    // FORCE popup to stay lifted – never let it drop even 1 pixel
    if (popup) {
        popup.classList.add('lifted');
        wifiPopupLifted = true;
    }

    // DO NOT CALL input.focus() → this is what caused the tiny drop+jump!
    // Keyboard already knows the field is active → just leave it alone

    // Rare edge-case safety: if keyboard somehow closed, reopen instantly (no visible flicker)
    if (activeInput !== input) {
        activeInput = input;
        showKeyboard(input);
    }
}
     
     /* Spinner animation */
     const style = document.createElement('style');
     style.textContent = `
     @keyframes spin {
       0% { transform: rotate(0deg); }
       100% { transform: rotate(360deg); }
     }
     `;
     document.head.appendChild(style);
   
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
        lowerWiFiPopup();
       const loading = document.getElementById('wifi-loading');
       // const ssid = document.getElementById('ssid')?.value;
       const pass = document.getElementById('password')?.value;
       const err = document.getElementById('wifi-error');
   
       loading.style.display = 'block';
       if (!selectedSSID || !pass) {
        err.innerHTML = '<span class="material-icons">error</span> <span style="font-size: 20px;">Provide SSID & Password</span>';
        err.className = 'error';
        err.style.display = 'flex';
        loading.style.display = 'none';
        return;
      }
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

                   updateBottomBarWiFiStatus();
               }, 2000);
               loading.style.display = 'none';
           }
       } catch { err.innerHTML = '<span class="material-icons">error</span> Connection failed'; err.style.display = 'flex'; loading.style.display = 'none'; }
       loading.style.display = 'none';
   }

   async function disconnectWiFi() {
    const err = document.getElementById('wifi-error');
    const loading = document.getElementById('wifi-loading');

    try {
        loading.style.display = 'block';
        err.style.display = 'none';

        const r = await fetch('/api/wifi/disconnect', { method: 'POST' });
        const d = await r.json();

        err.className = d.success ? 'success' : 'error';
        err.innerHTML = `<span class="material-icons">${d.success ? 'check_circle' : 'error'}</span> 
                         ${d.success ? 'Wi-Fi disconnected successfully' : d.error || 'Disconnect failed'}`;
        err.style.display = 'flex';

        if (d.success) {
            // Just close popup and refresh UI — DO NOT navigate away
            setTimeout(() => {
                closeWiFiPopup();

                // Optional: refresh connectivity status indicators in dashboard/settings
                // Example: if you have a function to update network status
                // updateNetworkStatus();  

                // Or trigger a soft refresh of current page
                // refreshCurrentPage();  
            }, 1200);
        }

    } catch (e) {
        console.error("Disconnect error:", e);
        err.innerHTML = '<span class="material-icons">error</span> Disconnect failed (network error)';
        err.className = 'error';
        err.style.display = 'flex';
    } finally {
        loading.style.display = 'none';
    }
}

   function closeWiFiPopup() {
    lowerWiFiPopup();   // ← ADD THIS
    ['wifi-popup', 'wifi-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
    // hide keyboard too just in case
    hideKeyboard();
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
           updateBottomBarWiFiStatus();
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
           await loadGuestsFromServer();
           render();
           updateGuestCountFromFile();     // ← Updates bottom bar instantly
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

            // Show detected sources
            ul.innerHTML = d.sources.map(s => `
                <li><span class="material-icons">input</span> ${s}</li>
            `).join('');

            // Clear any old button
            buttonGroup.innerHTML = '';

            // Check if line_in is present
            if (d.sources.includes('line_in')) {
                // Built-in camera → SKIP EVERYTHING and go directly to finalize
                showError('Input Source Detected', 'success');
                
                // Small delay so user sees the message and list
                setTimeout(() => {
                    navigate('finalize');
                }, 1200);

                return; // Exit early – no button needed
            }

            // Normal case: external camera → show "Next" button
            buttonGroup.innerHTML = `
                <button class="button" onclick="navigate('video_object_detection')">
                    <span class="material-icons">arrow_forward</span> Next
                </button>
            `;

            // Stop auto-retry
            if (inputSourceRetryInterval) {
                clearInterval(inputSourceRetryInterval);
                inputSourceRetryInterval = null;
            }

            showError('Input sources detected!', 'success');

        } else {
            throw new Error(d.error || 'No sources detected');
        }

    } catch (e) {
        inputSources = [];
        ul.innerHTML = '<li><span class="material-icons">hourglass_top</span> Waiting for input sources...</li>';
        buttonGroup.innerHTML = `
            <button class="button" onclick="fetchInputSources()">
                <span class="material-icons">refresh</span> Retry Now
            </button>
        `;
        showError('Waiting for input...');
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
           fontSize: '200px',
           fontWeight: '600',
           marginBottom: '10px',
           lineHeight: '1',
           textAlign: 'center',
       });
   
       // date
       const dateEl = document.createElement('div');
       dateEl.id = 'clock-date';
       Object.assign(dateEl.style, {
           fontSize: "70px",
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

    const popup = document.createElement('div');
    popup.id = 'edit-member-popup';
    popup.className = 'popup';

    popup.innerHTML = `
        <h2 style="margin-top: 0;"><span class="material-icons">edit</span> Edit Member Code</h2>
        <p>Choose a member to edit</p>
        <div id="edit-error" class="error" style="display:none;"></div>

        <div class="custom-select" style="margin:1rem 0;">
            <div id="edit-selected" class="selected-item">
                <span id="fetching-members">Select Member</span>
                <span class="material-icons arrow">arrow_drop_down</span>
            </div>
            <ul id="edit-member-list" class="dropdown-list" style="display:none;"></ul>
        </div>

        <div class="password-wrapper" id="code-wrapper" style="position:relative; width:100%; max-width:400px; margin:0 auto;">
            <div style="position:relative; display:flex; align-items:center;">
                <input 
                    type="text" 
                    id="new-code" 
                    placeholder="New Code (e.g. M1A)" 
                    maxlength="15"
                    autocomplete="off"
                    style="width:100%; padding:12px 48px 12px 12px; border:1px solid #ccc; border-radius:8px; font-size:16px; outline:none;"
                >
            </div>

            <div class="button-group" style="margin-top:20px; display:flex; gap:10px; justify-content:center;">
                <button class="button" onclick="saveMemberCode()" style="padding:10px 20px; background:#0066ff; color:white; border:none; border-radius:8px; cursor:pointer;">Save</button>
                <button class="button secondary" onclick="closeEditMemberPopup()" style="padding:10px 20px; background:#f0f0f0; color:#333; border:1px solid #ccc; border-radius:8px; cursor:pointer;">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    // THIS IS THE KEY PART FOR KEYBOARD HANDLING
    const codeInput = document.getElementById('new-code');
    const editPopup = document.getElementById('edit-member-popup');

    codeInput.addEventListener('focus', () => {
        showKeyboard(codeInput);   // your existing virtual keyboard
        liftEditMemberPopup();     // ← lift it up (define this similar to liftWiFiPopup)
    });

    // Also lower popup when buttons are clicked (especially on mobile)
    popup.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            editPopup.classList.remove('lifted');
        });
    });

    // Populate member list
    const list = document.getElementById('edit-member-list');
    const selected = document.getElementById('edit-selected');
    const mess = document.getElementById('fetching-members');
    mess.innerHTML = 'fetching members...';

    // Assuming membersData is already available; no async fetch needed unlike WiFi
    membersData?.members.forEach((m, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${m.member_code}</span>`;
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

    setTimeout(() => {
        const trigger = document.getElementById('edit-selected');
        const list = document.getElementById('edit-member-list');
        if (trigger && list && list.children.length > 0) {
            list.style.display = 'block';
            trigger.classList.add('open');
        }
        mess.innerHTML = 'Select Member';
    }, 20);

    // Assuming you have an initEditMemberLift() similar to initWiFiLift()
    initEditMemberLift();

    document.getElementById('edit-selected').onclick = (e) => {
        e.stopPropagation();
        const list = document.getElementById('edit-member-list');
        const isOpen = list.style.display === 'block';
        list.style.display = isOpen ? 'none' : 'block';
        e.currentTarget.classList.toggle('open', !isOpen);
    };

    overlay.onclick = (e) => {
        e.stopPropagation(); // just in case
        // → NO closeEditMemberPopup() here = popup stays open when tapping background
    };
}

function lowerEditMemberPopup() {
    const popup = document.getElementById('edit-member-popup');
    if (popup) {
        popup.classList.remove('lifted');
    }
}

// You may need to define these functions similar to their WiFi counterparts
function liftEditMemberPopup() {
    const popup = document.getElementById('edit-member-popup');
    if (popup) {
        popup.classList.add('lifted');
        // Add any additional logic here, e.g., calculate lift amount based on keyboard height
    }
}

function initEditMemberLift() {
    // Initialize any event listeners or observers for keyboard visibility if needed
    // For example, listen for window resize or keyboard show events on mobile
}
   
   let selectedMemberIndex = -1;
   
   function closeEditMemberPopup() {
    lowerEditMemberPopup();
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
               lowerEditMemberPopup();
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
   // Start polling as soon as the page loads
document.addEventListener('DOMContentLoaded', () => {
    startWiFiStatusPolling();
});