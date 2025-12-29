/* ==============================================================
   states.js
   All HTML templates for each installation step
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
                <div class="bar-left">
                    <button class="bar-btn" id="bar-btn-settings" onclick="showSettingsPopup()">
                        <span class="material-icons ">settings</span>
                    </button>
                    <button class="bar-btn" id="bar-btn-edit_member" onclick="showEditMemberPopup()">
                        <span class="material-icons">edit</span>
                    </button>
                    <button class="bar-btn" id="bar-btn-details" onclick="showEditMemberPopup()">
                        <span class="material-icons">info</span>
                    </button>
                </div>
                <div class="bar-right">
                    <button class="bar-btn" id="bar-btn-add_guest" onclick="openDialog()">
                        <span class="material-icons">add</span>
                        <span class="btn-text">Add Guest &nbsp;</span>
                        <span class="guest-count">${guests.length} / 8</span>
                    </button>
                    <button class="bar-btn" id="bar-btn-wifi" onclick="showWiFiPopup()">
                        <span class="btn-text">Disconnected &nbsp;</span>
                        <span class="material-icons ">wifi</span>
                    </button>
                </div>
            </div>
            <div style="position:fixed; bottom:4px; left:4px; display:flex; justify-content:center; align-items:center; z-index:999; scale: 1.2;">
            </div>
        </div>
    </div>
    <div id="screensaver"></div>`;
    },
};