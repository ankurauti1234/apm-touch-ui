// /* ==============================================================
//    settings.js
//    Settings popup + brightness slider + reboot/shutdown
//    ============================================================== */

// function showSettingsPopup() {
//     if (document.getElementById('settings-popup')) {
//         closeSettingsPopup();
//         return;
//     }

//     const overlay = document.createElement('div');
//     overlay.id = 'settings-overlay';
//     overlay.className = 'overlay';

//     const popup = document.createElement('div');
//     popup.id = 'settings-popup';
//     popup.className = 'popup';

//     popup.innerHTML = `
//         <div class="popup-header">
//             <h2>
//                 <span class="material-icons" style="font-size:2.2rem;color:var(--primary);">settings</span>
//                 Settings
//             </h2>
//             <button class="close-btn" onclick="closeSettingsPopup()" aria-label="Close">
//                 <span class="material-icons">close</span>
//             </button>
//         </div>

//         <!-- Brightness Control -->
//         <div class="setting-item brightness-control">
//             <div class="setting-label">
//                 <span class="material-icons">brightness_medium</span>
//                 <span>Brightness</span>
//             </div>
//             <div class="brightness-wrapper">
//                 <span class="sun-icon moon">0</span>
//                 <input type="range" id="brightness-slider" min="51" max="255" step="1" value="180">
//                 <span class="sun-icon">100</span>
//             </div>
//         </div>

//         <!-- Action Buttons -->
//         <div class="settings-grid">
//             <button class="setting-btn wifi-btn" onclick="showWiFiPopup()">
//                 <span class="material-icons">wifi</span>
//                 <span>Wi-Fi Network</span>
//             </button>

//             <button class="setting-btn reboot-btn" onclick="restart()">
//                 <span class="material-icons">refresh</span>
//                 <span>Reboot System</span>
//             </button>

//             <button class="setting-btn shutdown-btn" onclick="shutdown()">
//                 <span class="material-icons">power_settings_new</span>
//                 <span>Shutdown</span>
//             </button>
//         </div>
//     `;

//     document.body.append(overlay, popup);

//     if (document.getElementById('wifi-popup')) closeWiFiPopup();

//     overlay.addEventListener('click', (e) => {
//         if (e.target === overlay) closeSettingsPopup();
//     });

//     // Initialize brightness slider with current value from backend
//     initBrightnessControl();
// }

// function closeSettingsPopup() {
//     document.getElementById('settings-overlay')?.remove();
//     document.getElementById('settings-popup')?.remove();
// }

// async function initBrightnessControl() {
//     const slider = document.getElementById('brightness-slider');
//     if (!slider) return;

//     try {
//         const res = await fetch('/api/current_brightness');
//         const data = await res.json();
//         if (data.success && typeof data.brightness === 'number') {
//             const value = Math.round(((data.brightness - 51) / (255 - 51)) * 255);
//             slider.value = value;
//             originalBrightness = value;
//         }
//     } catch (err) {
//         console.warn('Could not fetch current brightness:', err);
//     }

//     slider.addEventListener('input', async (e) => {
//         const val = parseInt(e.target.value);
//         originalBrightness = val;
//         await updateBrightnessAPI(val);
//     });
// }