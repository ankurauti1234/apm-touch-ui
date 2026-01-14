/* Step: Finalize & Main Dashboard */
window.Steps = window.Steps || {};

window.Steps.finalize = (details) => `
    <div class="glass-card">
        <h1 class="text-h1">Setup Complete</h1>
        <p class="text-body">Ready to finalize your configuration.</p>
        
        <div class="scroll-content">
            <div class="summary-grid">
                <!-- Meter ID -->
                <div class="summary-tile">
                    <span class="material-icons" style="color:var(--primary);">memory</span>
                    <div>
                        <div class="text-label">Meter ID</div>
                        <div style="font-weight:600;">${details.meter_id}</div>
                    </div>
                </div>
                <!-- Connectivity -->
                <div class="summary-tile">
                     <span class="material-icons" style="color:var(--success);">wifi</span>
                    <div>
                        <div class="text-label">Network</div>
                        <div style="font-weight:600;">${details.connectivity}</div>
                    </div>
                </div>
                 <!-- HHID -->
                <div class="summary-tile">
                     <span class="material-icons" style="color:var(--warning);">home</span>
                    <div>
                        <div class="text-label">Household</div>
                        <div style="font-weight:600;">${details.hhid || 'N/A'}</div>
                    </div>
                </div>
                 <!-- Video -->
                <div class="summary-tile ${details.video_detection ? 'active' : 'error'}">
                     <span class="material-icons">videocam</span>
                    <div>
                        <div class="text-label">Camera</div>
                        <div style="font-weight:600;">${details.video_detection ? 'Active' : 'Offline'}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div style="width: 100%; display: flex; gap: 16px; margin-top: 24px;">
             <button class="btn btn-secondary" onclick="navigate('otp_verification')" style="flex: 1;">
                 Back
            </button>
            <button class="btn btn-primary" onclick="finalizeInstallation()" style="flex: 2;">
                Finish Setup <span class="material-icons">check</span>
            </button>
        </div>
    </div>
`;

window.Steps.main = () => {
    // This is the main dashboard after setup
     const members = membersData?.members || [];
     const max = 8;
     const shown = members.slice(0, max);
     const empty = max - shown.length;
     
     return `
        <div class="center-stage" style="justify-content: flex-start; padding-top: 100px;">
            <div class="members-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; width: 100%; max-width: 900px;">
                ${shown.map((m, i) => `
                    <div class="member-card" style="height: 180px; background: #2c2c2e; border-radius: var(--radius-lg); overflow: hidden; position: relative;">
                         <!-- Fake Image for now if no URL -->
                         <div style="width: 100%; height: 100%; background: url('${avatar(m.gender, m.dob)}') center/cover;"></div>
                         <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); color: white; padding: 12px; text-align: center; font-weight: 600;">
                            ${m.name || 'Member ' + (i+1)}
                         </div>
                    </div>
                `).join('')}
                
                ${Array(empty).fill().map(() => `
                     <div class="member-card empty" style="height: 180px; border: 2px dashed rgba(255,255,255,0.1); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center;">
                        <span class="material-icons" style="font-size: 40px; color: rgba(255,255,255,0.2);">person_add</span>
                     </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Floating Bottom Bar -->
        <div class="bottom-bar-float">
            <div class="bar-tools">
                <button class="btn btn-icon btn-secondary" onclick="showSettingsPopup()"><span class="material-icons">settings</span></button>
                <button class="btn btn-icon btn-secondary" onclick="showMeterIdPopup()"><span class="material-icons">info</span></button>
            </div>
            
            <div class="bar-actions">
                 <button class="btn btn-primary" onclick="openDialog()" style="border-radius: 30px;">
                    <span class="material-icons">add</span> Add Guest
                </button>
            </div>
        </div>
        <div id="screensaver"></div>
     `;
};
