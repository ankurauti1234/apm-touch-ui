/* ==============================================================
   states.js
   All HTML templates for each installation step
   ============================================================== */

const states = {
    loading: () => `
        <div class="loading">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-muted);">Initializing System...</p>
        </div>`,

    welcome: () => `
        <h1>Welcome to Indi Meter</h1>
        <p>Your smart energy future starts here.</p>

        <div style="height: 2px; width: 50px; background: var(--primary); margin: 1rem auto; border-radius: 2px;"></div>
        
        <div class="button-group">
            <button class="button" onclick="navigate('connect_select')">
                <span class="material-icons">play_arrow</span> Start Installation
            </button>
        </div>
       `,

    connect_select: (currentSSID = null) => `
        <h1>Select Connectivity</h1>
        <p>Choose how your meter connects to the cloud.</p>
        <div id="error" class="error" style="display:none;"></div>
        
        ${currentSSID ? `
            <div style="padding:1.5rem; background: rgba(255,255,255,0.05); border-radius: var(--radius-md); margin: 1.5rem 0; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display:flex; align-items:center; justify-content:center; gap:0.8rem; margin-bottom:0.5rem;">
                    <span class="material-icons" style="color:var(--success);">wifi</span>
                    <strong style="color:white; font-size:1.1rem;">Connected via Wi-Fi</strong>
                </div>
                <p style="margin:0; color:var(--text-muted); font-family:monospace;">${currentSSID}</p>
            </div>
            
            <div class="button-group">
                <button class="button" onclick="navigate('network_test','wifi')">
                    Continue with Wi-Fi <span class="material-icons">arrow_forward</span>
                </button>
                <button class="button secondary" onclick="showWiFiPopup()">
                    <span class="material-icons">settings</span> Change Wi-Fi
                </button>
            </div>
        ` : `
            <div class="button-group" style="flex-direction: column; width: 100%; max-width: 300px; margin: 0 auto;">
                <button class="button" onclick="checkWiFi()" style="justify-content: center; width: 100%;">
                    <span class="material-icons">wifi</span> Connect via Wi-Fi
                </button>
                <button class="button secondary" onclick="navigate('network_test','gsm')" style="justify-content: center; width: 100%;">
                    <span class="material-icons">cell_tower</span> Connect via GSM
                </button>
            </div>
        `}
         `,

    network_test: (status = null) => `
        <h1>Network Diagnostic</h1>
        <p>Verifying ${connectivityMode ? connectivityMode.toUpperCase() : 'Network'} connectivity...</p>
        
        <div id="error" style="display:none;"></div>
        
        ${status === 'success' ? `
            <div class="success" style="display:flex;">
                <span class="material-icons">check_circle</span> 
                <div>
                    <strong>Connection Verified</strong><br>
                    <small>Signal strength is excellent.</small>
                </div>
            </div>
            <div class="button-group">
                <button class="button" onclick="navigate('display_meter')">
                    Next Step <span class="material-icons">arrow_forward</span>
                </button>
            </div>
        ` : status === 'error' ? `
            <div class="error" style="display:flex;">
                <span class="material-icons">error_outline</span>
                <div>
                    <strong>Connection Failed</strong><br>
                    <small>Please check your settings and try again.</small>
                </div>
            </div>
            <div class="button-group">
                <button class="button" onclick="navigate('network_test','${connectivityMode}')">
                    <span class="material-icons">refresh</span> Retry
                </button>
                <button class="button secondary" onclick="navigate('connect_select')">
                    <span class="material-icons">arrow_back</span> Go Back
                </button>
            </div>
        ` : `
            <div class="loading">
                <div class="spinner"></div>
                <p style="margin-top:1rem;">Running ping tests...</p>
            </div>
        `}
    `,

    display_meter: () => `
        <h1>Meter Identification</h1>
        <p>Confirm the Meter ID displayed on your device.</p>
        
        <div style="padding: 2rem; background: rgba(0,0,0,0.3); border-radius: var(--radius-lg); margin: 2rem 0; text-align: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: inset 0 0 20px rgba(0,0,0,0.5);">
            <div style="display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-bottom:1rem; opacity: 0.7;">
                <span class="material-icons">qr_code_2</span>
                <span style="text-transform: uppercase; letter-spacing: 1px; font-size: 0.9rem;">Device Serial</span>
            </div>
            <strong style="font-size: 2.5rem; color: var(--primary); letter-spacing: 2px; font-variant-numeric: tabular-nums;">
                ${meterId || '----'}
            </strong>
        </div>
        
        <div class="button-group">
            <button class="button" onclick="navigate('hhid_input')">
                Confirm & Next <span class="material-icons">arrow_forward</span>
            </button>
            <button class="button secondary" onclick="navigate('connect_select')">
                <span class="material-icons">arrow_back</span> Back
            </button>
        </div>
    `,

    hhid_input: () => `
        <h1>Household Setup</h1>
        <p>Link this meter to your household.</p>
        <div id="error" class="error" style="display:none;"></div>

        <div class="hhid-container" style="margin: 2rem 0;">
            <div style="position: relative; width: 100%; max-width: 300px;">
                <span class="hhid-prefix" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); opacity: 0.7; font-size: 1.2rem;">HHID</span>
                <input type="text"
                    id="hhid"
                    maxlength="4"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    placeholder="1002"
                    autocomplete="off"
                    onfocus="showKeyboard(this)"
                    oninput="onlyNumbers(this)"
                    style="padding-left: 4.5rem; letter-spacing: 4px; font-weight: 600; font-size: 1.5rem;"
                >
            </div>
        </div>

        <div class="button-group">
            <button class="button" onclick="submitHHID()">
                <span class="material-icons">send</span> Send OTP
            </button>
            <button class="button secondary" onclick="navigate('display_meter')">
                <span class="material-icons">arrow_back</span> Back
            </button>
        </div>         
    `,

    otp_verification: () => `
        <h1>Verify Identity</h1>
        <p>Enter the 4-digit code sent to your registered email.</p>
        <div id="error" class="error" style="display:none;"></div>
       
        <div style="margin: 2rem 0; width: 100%; max-width: 300px; margin-left:auto; margin-right:auto;">
            <input
                type="text"
                id="otp"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="4"
                placeholder="0 0 0 0"
                autocomplete="off"
                oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0,4); if(this.value.length === 4) this.blur();"
                onfocus="showKeyboard(this)"
                style="letter-spacing: 1rem; font-weight: 700; font-size: 1.8rem; text-align: center;"
            >
        </div>
       
        <div class="button-group">
            <button class="button" onclick="submitOTP()">
                <span class="material-icons">verified</span> Verify Code
            </button>
            <button class="button secondary" onclick="retryOTP()">
                <span class="material-icons">refresh</span> Resend
            </button>
        </div>
    `,

    input_source_detection: () => `
        <h1>System Check</h1>
        <p>Scanning for input devices...</p>
        
        <div id="error" class="error" style="display:none;"></div>
        
        <div class="loading" id="input-loading">
            <div class="spinner"></div>
            <p style="margin-top:1rem;">Detecting hardware...</p>
        </div>
        
        <div id="input-results" style="display:none; width: 100%;">
            <ul id="input-list" style="list-style: none; padding: 0; text-align: left; background: rgba(255,255,255,0.05); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 2rem;">
                <!-- Filled by JS -->
            </ul>
            <div class="button-group">
                <!-- Filled by JS -->
            </div>
        </div>
    `,

    video_object_detection: () => `
        <h1>Camera Diagnostics</h1>
        <p id="checking-video">Initializing video object detection module...</p>
        
        <div class="success" id="video-success" style="display:none;">
            <span class="material-icons">check_circle</span> Detection Active
        </div>
        
        <div class="loading" id="video-loading">
            <div class="spinner"></div>
            <p style="margin-top:1rem;">Running visual tests...</p>
        </div>
        
        <div id="video-results" style="display:none; width: 100%;">
            <div id="video-status" style="margin-bottom: 2rem;"></div>
            <div class="button-group">
                <!-- Filled by JS -->
            </div>
        </div>
    `,

    finalize: (details) => `
    <div class="summary-container" style="height:100%; display:flex; flex-direction:column;">
        <h1>Setup Complete</h1>
        <p>Ready to finalize your configuration.</p>

        <div id="error" class="error" style="display:none;"></div>

        <div class="card-scroll-content">
            <div class="card-grid">
                <!-- Meter ID -->
                <div class="summary-item">
                    <div class="item-icon"><span class="material-icons" style="color:var(--primary);">memory</span></div>
                    <div>
                        <div style="font-size:12px; opacity:0.6;">Meter ID</div>
                        <div style="font-weight:600;">${details.meter_id}</div>
                    </div>
                </div>
        
                <!-- HHID -->
                <div class="summary-item">
                    <div class="item-icon"><span class="material-icons" style="color:var(--warning);">home</span></div>
                    <div>
                        <div style="font-size:12px; opacity:0.6;">Household</div>
                        <div style="font-weight:600;">${details.hhid || 'N/A'}</div>
                    </div>
                </div>
        
                <!-- Connectivity -->
                <div class="summary-item">
                    <div class="item-icon"><span class="material-icons" style="color:var(--success);">wifi</span></div>
                    <div>
                        <div style="font-size:12px; opacity:0.6;">Network</div>
                        <div style="font-weight:600;">${details.connectivity}</div>
                    </div>
                </div>
        
                <!-- Video Status -->
                <div class="summary-item">
                    <div class="item-icon"><span class="material-icons" style="color:${details.video_detection ? 'var(--success)':'var(--error)'};">videocam</span></div>
                    <div>
                        <div style="font-size:12px; opacity:0.6;">Camera</div>
                        <div style="font-weight:600;">${details.video_detection ? 'Active' : 'Failed'}</div>
                    </div>
                </div>

                <!-- Input Sources -->
                <div class="summary-item" style="grid-column: span 2;">
                    <div class="item-icon"><span class="material-icons">usb</span></div>
                    <div>
                        <div style="font-size:12px; opacity:0.6;">Inputs</div>
                        <div style="font-weight:600; font-size:14px;">${details.input_sources.length ? details.input_sources.join(', ') : 'None'}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="button-group" style="padding-top:16px; border-top:1px solid rgba(255,255,255,0.1);">
            <button class="button" onclick="finalizeInstallation()">
                Finish Setup <span class="material-icons">check</span>
            </button>
            <button class="button secondary" onclick="navigate('input_source_detection')">
                <span class="material-icons">arrow_back</span> Back
            </button>
        </div>
    </div>`,

    main: () => {
        const max = 8;
        const members = membersData?.members || [];
        const shown = members.slice(0, max);
        const empty = max - shown.length;

        // Note: The main dashboard layout logic is heavily styling dependent.
        // We assume .main-dashboard, .members-grid, .member-card-grid, .bottom-bar 
        // are all handled in style.css.
        
        return `
    <div class="layout-reset" style="height: 100%; width: 100%;">
        <div class="main-dashboard fixed-layout" style="height: 100%; width: 100%; position: relative;">
            
            <!-- Grid -->
            <div class="members-grid">
                ${shown.map((m, i) => `
                    <div class="member-card-grid ${m.active === false ? 'inactive' : 'active'}"
                         onclick="toggleMember(${i})"
                         style="--bg-image:url('${avatar(m.gender, m.dob)}')">
                         
                        <div class="status-indicator" style="
                            position: absolute; top: 10px; right: 10px; 
                            width: 12px; height: 12px; 
                            border-radius: 50%; 
                            background: ${m.active !== false ? 'var(--success)' : 'var(--text-muted)'};
                            box-shadow: 0 0 10px ${m.active !== false ? 'var(--success)' : 'transparent'};
                        "></div>
                        
                        <div class="name-tag">${m.name || m.member_code || 'Unnamed'}</div>
                    </div>`).join('')}
                
                ${Array(empty).fill().map(() => `
                    <div class="member-card-grid empty">
                        <span class="material-icons" style="font-size: 3rem; opacity: 0.2;">person_add</span>
                    </div>
                `).join('')}
            </div>

            <!-- Bottom Bar -->
            <div class="bottom-bar">
                <div class="bar-left">
                    <button class="bar-btn" id="bar-btn-settings" onclick="showSettingsPopup()" title="Settings">
                        <span class="material-icons">settings</span>
                    </button>
                    <button class="bar-btn" id="bar-btn-edit_member" onclick="showEditMemberPopup()" title="Edit Members">
                        <span class="material-icons">edit</span>
                    </button>
                    <button class="bar-btn" id="bar-btn-details" onclick="showMeterIdPopup()" title="Info">
                        <span class="material-icons">info</span>
                    </button>
                </div>
                
                <div class="bar-right">
                    <button class="button" id="bar-btn-add_guest" onclick="openDialog()" style="height: 50px; border-radius: 25px; padding: 0 1.5rem;">
                        <span class="material-icons">add</span>
                        <span class="btn-text">Add Guest</span>
                        <span class="guest-count" style="background: rgba(255,255,255,0.2); px; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; margin-left: 0.5rem;">${guests.length} / 8</span>
                    </button>
                    
                    <div id="bar-wifi-status" style="margin-left: 1rem;">
                        <!-- Injected by Wifi Logic -->
                    </div>
                </div>
            </div>
            
            <div style="position:fixed; bottom:4px; left:4px; display:flex; justify-content:center; align-items:center; z-index:999; scale: 1.2;"></div>
        </div>
    </div>
    <div id="screensaver"></div>`;
    },
};