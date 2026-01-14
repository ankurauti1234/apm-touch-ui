/* Step: Connect Selection */
window.Steps = window.Steps || {};

window.Steps.connect_select = (currentSSID = null) => `
    <div class="glass-card">
        <h1 class="text-h1">Connectivity</h1>
        <p class="text-body">Choose how your meter connects to the cloud.</p>
        
        <div id="error" class="error" style="display:none;"></div>

        ${currentSSID ? `
            <!-- Connected State -->
            <div class="summary-tile active" style="justify-content: center; flex-direction: column; text-align: center; width: 100%; margin: 20px 0;">
                <span class="material-icons" style="font-size: 32px; color: var(--success);">wifi</span>
                <div>
                    <div class="text-label" style="opacity: 0.7;">Connected To</div>
                    <div style="font-size: 20px; font-weight: 600;">${currentSSID}</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 16px; width: 100%;">
                 <button class="btn btn-primary" onclick="navigate('network_test','wifi')" style="flex: 1;">
                    Continue <span class="material-icons">arrow_forward</span>
                </button>
                <button class="btn btn-secondary" onclick="showWiFiPopup()" style="flex: 1;">
                    Change Network
                </button>
            </div>
        ` : `
            <!-- Disconnected State -->
            <div style="display: flex; flex-direction: column; gap: 16px; width: 100%; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="showWiFiPopup()" style="height: 64px; justify-content: flex-start;">
                    <span class="btn-icon" style="background: var(--primary); color: white; display: flex; align-items: center; justify-content: center;"><span class="material-icons">wifi</span></span>
                    <span style="flex: 1; text-align: left; padding-left: 12px; font-size: 18px;">Connect via Wi-Fi</span>
                    <span class="material-icons">chevron_right</span>
                </button>
                
                <button class="btn btn-secondary" onclick="navigate('network_test','gsm')" style="height: 64px; justify-content: flex-start;">
                    <span class="btn-icon" style="background: var(--success); color: white; display: flex; align-items: center; justify-content: center;"><span class="material-icons">cell_tower</span></span>
                    <span style="flex: 1; text-align: left; padding-left: 12px; font-size: 18px;">Connect via GSM</span>
                    <span class="material-icons">chevron_right</span>
                </button>
            </div>
        `}
    </div>
`;
