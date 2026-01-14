/* Step: Input & Video Detection */
window.Steps = window.Steps || {};

window.Steps.input_source_detection = () => `
    <div class="glass-card">
        <h1 class="text-h1">Hardware Check</h1>
        <p class="text-body">Scanning for input peripherals...</p>
        
        <div id="error" class="error" style="display:none;"></div>
        
        <div class="loading" id="input-loading">
            <div class="spinner"></div>
            <p class="text-label" style="margin-top: 16px;">Detecting USB Devices...</p>
        </div>
        
        <div id="input-results" style="display:none; width: 100%;">
            <ul id="input-list" style="list-style: none; padding: 0; margin: 20px 0; background: rgba(0,0,0,0.2); border-radius: var(--radius-md); overflow: hidden;">
                <!-- Filled by JS -->
            </ul>
            <div class="button-group">
                 <!-- Filled by JS -->
            </div>
        </div>
    </div>
`;

window.Steps.video_object_detection = () => `
    <div class="glass-card">
        <h1 class="text-h1">Visual Diagnostic</h1>
        <p class="text-body" id="checking-video">Initializing camera module...</p>
        
        <div class="summary-tile active" id="video-success" style="display:none; justify-content: center;">
            <span class="material-icons">check_circle</span> Camera Operational
        </div>
        
        <div class="loading" id="video-loading">
            <div class="spinner"></div>
            <p class="text-label" style="margin-top: 16px;">Verifying Feed...</p>
        </div>
        
        <div id="video-results" style="display:none; width: 100%;">
            <div id="video-status" style="margin: 20px 0;"></div>
             <div class="button-group">
                 <!-- Filled by JS -->
            </div>
        </div>
    </div>
`;
