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
        <div style="position:fixed; bottom:4px; left:4px; display:flex; justify-content:center; align-items:center; z-index:999; scale: 1.2;">
        </div>
         `,

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
            <button class="button" onclick="submitHHID(); navigate(otp_verification)">
                <span class="material-icons">send</span> Submit & Send OTP
            </button>
            <button class="button secondary" onclick="navigate('display_meter')">
                <span class="material-icons">arrow_back</span> Back
            </button>
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
            <button class="button secondary" onclick="navigate('hhid_input')">
                <span class="material-icons">arrow_back</span> Back
            </button>
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
                        <div class="name-tag">${m.name || m.member_code || '??'}</div>
                    </div>`).join('')}
                ${Array(empty).fill().map(() => `
                    <div class="member-card-grid empty"><div class="name-tag">—</div></div>
                `).join('')}
            </div>
            <div class="bottom-bar">
                <div class="bar-left">
                    <button class="bar-btn" id="bar-btn-settings" onclick="showSettingsPopup()">
                        <span class="material-icons" style="font-size:1.7rem;">settings</span>
                    </button>
                    <button class="bar-btn" id="bar-btn-edit_member" onclick="showEditMemberPopup()">
                        <span class="material-icons" style="font-size:1.7rem;">edit</span>
                    </button>
                    <button class="bar-btn" id="bar-btn-details" onclick="showMeterIdPopup()">
                        <span class="material-icons" style="font-size:1.7rem;">info</span>
                    </button>
                </div>
                <div class="bar-right">
                    <button class="bar-btn" id="bar-btn-add_guest" onclick="openDialog()">
                        <span class="material-icons">add</span>
                        <span class="btn-text">Add Guest &nbsp;</span>
                        <span class="guest-count">${guests.length} / 8</span>
                    </button>
                    <button class="bar-btn" id="bar-btn-weather-city" onclick="showCityInputPopup()" title="Change weather city">
                        <span class="material-icons" style="font-size:1.7rem;">location_city</span>
                    </button>
                    <div id="bar-wifi-status">
                    
                    </div>
                </div>
            </div>
            <div style="position:fixed; bottom:4px; left:4px; display:flex; justify-content:center; align-items:center; z-index:999; scale: 1.2;">
            </div>
        </div>
    </div>
    <div id="screensaver"></div>`;
    },
};

function showCityInputPopup() {
    if (document.getElementById('city-input-popup')) return;

    const overlay = document.createElement('div');
    overlay.id = 'city-input-overlay';
    overlay.className = 'overlay';

    const popup = document.createElement('div');
    popup.id = 'city-input-popup';
    popup.className = 'popup';

    popup.innerHTML = `
        <h2 style="margin-top:0;"><span class="material-icons">location_city</span> Set Weather City</h2>
        <p>Enter city name for weather display</p>
        <div id="city-error" class="error" style="display:none; color:#ff9800; margin:8px 0;"></div>

        <div style="position:relative; width:100%; max-width:400px; margin:1rem auto;">
            <div style="position:relative; display:flex; align-items:center;">
                <input
                    type="text"
                    id="city-input-field"
                    placeholder="e.g. Mumbai, Yerevan, Tokyo"
                    maxlength="60"
                    autocomplete="off"
                    style="width:100%; padding:12px 16px; border:1px solid #ccc; border-radius:8px; font-size:18px; outline:none; box-sizing:border-box;"
                    autofocus
                >
            </div>

            <div class="button-group" style="margin-top:24px; display:flex; gap:12px; justify-content:center;">
                <button class="button" onclick="saveCityAndUpdate()">Save</button>
                <button class="button secondary" onclick="closeCityInputPopup()">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    const cityInput = document.getElementById('city-input-field');

    // ─── Keyboard & lift handling ─ same pattern as edit member ────────
    if (cityInput) {
        // Single focus listener (no duplicates)
        cityInput.addEventListener('focus', () => {
            showKeyboard(cityInput);  // assume this is what makes edit stable

            // Delay lift — this prevents initial flicker and reduces typing jitter
            setTimeout(() => {
                if (popup && document.activeElement === cityInput) {
                    popup.classList.add('lifted');  // use the same class as edit popup
                }
            }, 350);  // adjust 300–450 if needed; test what matches edit popup feel
        });

        // Remove lift on blur
        cityInput.addEventListener('blur', () => {
            popup.classList.remove('lifted');
        });
    }

    // Lower on button clicks (same as edit)
    popup.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            popup.classList.remove('lifted');
        });
    });

    // Close on overlay click
    overlay.addEventListener('click', closeCityInputPopup);

    // Escape to close
    const escHandler = e => {
        if (e.key === 'Escape') {
            closeCityInputPopup();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// Correct lift function – targets THIS popup
function liftCityPopup() {
    const popup = document.getElementById('city-input-popup');
    if (popup) popup.classList.add('lifted');
}

// Clean close – only city elements
function closeCityInputPopup() {
    const overlay = document.getElementById('city-input-overlay');
    const popup   = document.getElementById('city-input-popup');
    if (overlay) overlay.remove();
    if (popup)   popup.remove();
}

// Save function (unchanged except safety)
async function saveCityAndUpdate() {
    const input   = document.getElementById('city-input-field');
    const errorEl = document.getElementById('city-error');
    const city    = input?.value?.trim() || '';

    if (!city) {
        if (errorEl) {
            errorEl.textContent = "Please enter a city name";
            errorEl.style.display = 'block';
        }
        return;
    }

    if (errorEl) {
        errorEl.textContent = "Searching...";
        errorEl.style.display = 'block';
    }

    try {
        const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
        );
        const geo = await geoRes.json();

        if (!geo.results || !geo.results.length) {
            if (errorEl) errorEl.textContent = "City not found – try another name";
            return;
        }

        const loc = geo.results[0];
        localStorage.setItem('weatherLocation', JSON.stringify({
            name: loc.name,
            country: loc.country || '',
            lat: loc.latitude,
            lon: loc.longitude
        }));

        closeCityInputPopup();
        fetchWeather();

        if (typeof showToast === 'function') {
            showToast(`Weather set to ${loc.name}`);
        } else {
            alert(`Weather updated to ${loc.name}`);
        }

    } catch (err) {
        if (errorEl) errorEl.textContent = "Error looking up city – check connection";
        console.error(err);
    }
}