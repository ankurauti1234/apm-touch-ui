/* Step: Meter ID & HHID */
window.Steps = window.Steps || {};

window.Steps.display_meter = () => `
    <div class="glass-card">
        <h1 class="text-h1">Device Identity</h1>
        <p class="text-body">Confirm this Meter Identifier matches the physical label.</p>
        
        <div style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-strong); border-radius: var(--radius-lg); padding: 32px; margin: 24px 0; width: 100%;">
            <div class="text-label" style="opacity: 0.6; margin-bottom: 8px;">SERIAL NUMBER</div>
            <div style="font-size: 40px; font-weight: 700; font-family: monospace; letter-spacing: 2px; color: var(--primary);">
                ${meterId || '----'}
            </div>
        </div>
        
        <div style="width: 100%; display: flex; gap: 16px;">
             <button class="btn btn-secondary" onclick="navigate('video_object_detection')" style="flex: 1;">
                 Back
            </button>
            <button class="btn btn-primary" onclick="navigate('hhid_input')" style="flex: 2;">
                Confirm & Next <span class="material-icons">arrow_forward</span>
            </button>
        </div>
    </div>
`;

window.Steps.hhid_input = () => `
    <div class="glass-card">
        <h1 class="text-h1">Household Setup</h1>
        <p class="text-body">Enter your Household ID (HHID).</p>
        <div id="error" class="error" style="display:none;"></div>

        <div style="margin: 32px 0; width: 100%; max-width: 320px;">
            <div class="text-label" style="text-align: left; margin-bottom: 8px; margin-left: 4px;">HHID Number</div>
            <input type="text"
                class="input-base"
                id="hhid"
                maxlength="4"
                inputmode="numeric"
                pattern="[0-9]*"
                placeholder="Ex: 1002"
                autocomplete="off"
                onfocus="showKeyboard(this)"
                oninput="onlyNumbers(this)"
                style="font-size: 24px; font-weight: 600; letter-spacing: 2px;"
            >
        </div>

        <div style="width: 100%; display: flex; gap: 16px;">
             <button class="btn btn-secondary" onclick="navigate('display_meter')" style="flex: 1;">
                Back
            </button>
            <button class="btn btn-primary" onclick="submitHHID()" style="flex: 2;">
                Send OTP <span class="material-icons">send</span>
            </button>
        </div>
    </div>
`;

window.Steps.otp_verification = () => `
    <div class="glass-card">
        <h1 class="text-h1">Verification</h1>
        <p class="text-body">Enter the 4-digit code sent to your device.</p>
        <div id="error" class="error" style="display:none;"></div>

        <div style="margin: 32px 0; width: 100%; max-width: 240px;">
             <input type="text"
                class="input-base"
                id="otp"
                maxlength="4"
                inputmode="numeric"
                pattern="[0-9]*"
                placeholder="0 0 0 0"
                autocomplete="off"
                onfocus="showKeyboard(this)"
                style="font-size: 32px; font-weight: 700; letter-spacing: 8px; height: 64px;"
            >
        </div>
        
        <div style="width: 100%; display: flex; gap: 16px;">
             <button class="btn btn-secondary" onclick="retryOTP()" style="flex: 1;">
                Resend
            </button>
            <button class="btn btn-primary" onclick="submitOTP()" style="flex: 2;">
                Verify Code <span class="material-icons">check_circle</span>
            </button>
        </div>
    </div>
`;
