/* ==============================================================
   wifi.js
   Wi-Fi popup, scanning, connection, lift/lower logic + disconnected warning
   ============================================================== */

   let wifiPopupLifted = false;
   let selectedSSID = null;
   let availableNetworks = [];
   
   // ────────────────────────────────────────────────
   // Full-screen Wi-Fi Disconnected Warning
   // ────────────────────────────────────────────────
   
   function createOrGetWifiWarning() {
       let warning = document.getElementById('wifi-disconnected-warning');
       if (warning) return warning;
   
       warning = document.createElement('div');
       warning.id = 'wifi-disconnected-warning';
       warning.innerHTML = `
           <div style="max-width:420px; padding:24px;">
               <h2 style="margin:0 0 16px 0; font-size:2.1rem;">Wi-Fi Disconnected</h2>
               <p style="margin:0 0 28px 0; font-size:1.15rem; opacity:0.95;">
                   Please connect to a Wi-Fi network to continue using online features.
               </p>
               <button class="connect-btn" style="
                   background:white;
                   color:#f59e0b;
                   border:none;
                   padding:14px 32px;
                   font-size:1.1rem;
                   font-weight:600;
                   border-radius:12px;
                   cursor:pointer;
                   box-shadow:0 4px 12px rgba(0,0,0,0.18);
                   transition: all 0.18s;
               ">
                   Connect to Wi-Fi
               </button>
           </div>
       `;
   
       // Click anywhere on overlay → open Wi-Fi popup
       warning.addEventListener('click', (e) => {
           showWiFiPopup();
       });
   
       document.body.appendChild(warning);
       return warning;
   }
   
   function updateWifiDisconnectedWarning(isConnected) {
       const warning = createOrGetWifiWarning();
       if (isConnected) {
           warning.classList.remove('visible');
       } else {
           warning.classList.add('visible');
       }
   }
   
   // Make sure CSS exists (you can move this to your main CSS file)
   if (!document.getElementById('wifi-warning-style')) {
       const style = document.createElement('style');
       style.id = 'wifi-warning-style';
       style.textContent = `
           #wifi-disconnected-warning {
               position: fixed;
               inset: 0 0 64px 0;           /* leave space for bottom bar */
               background: rgba(245, 158, 11, 0.90);
               color: white;
               display: none;
               justify-content: center;
               align-items: center;
               z-index: 900;
               text-align: center;
               backdrop-filter: blur(3px);
               -webkit-backdrop-filter: blur(3px);
               transition: opacity 0.4s ease;
           }
   
           #wifi-disconnected-warning.visible {
               display: flex;
               opacity: 1;
           }
   
           #wifi-disconnected-warning .connect-btn:hover {
               transform: translateY(-2px);
               box-shadow: 0 6px 16px rgba(0,0,0,0.22);
           }
       `;
       document.head.appendChild(style);
   }
   
   // ────────────────────────────────────────────────
   // Existing Wi-Fi Popup & Logic (with small enhancements)
   // ────────────────────────────────────────────────
   
   async function showWiFiPopup() {
       closeSettingsPopup();
       closeWiFiPopup();
   
       const overlay = document.createElement('div');
       overlay.id = 'wifi-overlay';
       overlay.className = 'overlay';
   
       const popup = document.createElement('div');
       popup.id = 'wifi-popup';
       popup.className = 'popup';
   
       popup.innerHTML = `
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
   
           <div class="password-wrapper" id="password-wrapper" style="position:relative;width:100%;max-width:400px;margin:0 auto;">
               <div style="position:relative;display:flex;align-items:center;">
                   <input
                       type="password"
                       id="password"
                       placeholder="Password"
                       autocomplete="off"
                       style="width:100%;padding:12px 48px 12px 12px;border:1px solid #ccc;border-radius:8px;font-size:16px;outline:none;"
                   >
                   <button type="button" class="toggle-password" onclick="togglePasswordVisibility(event)"
                       style="position:absolute;right:8px;background:none;border:none;cursor:pointer;padding:8px;color:#666;">
                       <span class="material-icons" id="eye-icon" style="font-size:24px;">visibility</span>
                   </button>
               </div>
   
               <div id="wifi-loading" style="display:none;text-align:center;margin-top:12px;">
                   <div class="spinner" style="border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;width:32px;height:32px;animation:spin 1s linear infinite;margin:0 auto 8px;"></div>
                   <div>Connecting...</div>
               </div>
   
               <div class="button-group" style="margin-top:20px;display:flex;gap:10px;justify-content:center;">
                   <button class="button" onclick="connectWiFi()">Connect</button>
                   <button class="button secondary" onclick="disconnectWiFi()">Disconnect</button>
                   <button class="button secondary" onclick="closeWiFiPopup()">Close</button>
               </div>
           </div>
       `;
   
       document.body.appendChild(overlay);
       document.body.appendChild(popup);
   
       const passwordInput = document.getElementById('password');
       passwordInput.addEventListener('focus', () => {
           showKeyboard(passwordInput);
           liftWiFiPopup();
       });
   
       popup.querySelectorAll('button').forEach(btn => {
           btn.addEventListener('click', () => {
               document.getElementById('wifi-popup')?.classList.remove('lifted');
           });
       });
   
       document.getElementById('fetching').textContent = 'fetching wifi...';
       await scanWiFi();
   
       setTimeout(() => {
           const trigger = document.getElementById('selected-network');
           const list = document.getElementById('network-list');
           if (trigger && list && list.children.length > 0) {
               list.style.display = 'block';
               trigger.classList.add('open');
           }
           document.getElementById('fetching').textContent = 'Select Network';
       }, 20);
   
       document.getElementById('selected-network').onclick = (e) => {
           e.stopPropagation();
           const list = document.getElementById('network-list');
           const isOpen = list.style.display === 'block';
           list.style.display = isOpen ? 'none' : 'block';
           e.currentTarget.classList.toggle('open', !isOpen);
       };
   
       overlay.onclick = (e) => e.stopPropagation();
   }
   
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
       if (e) {
           e.stopPropagation();
           e.preventDefault();
           e.stopImmediatePropagation();
       }
       const input = document.getElementById('password');
       const icon = document.getElementById('eye-icon');
       if (!input || !icon) return;
   
       const wasPassword = input.type === 'password';
       input.type = wasPassword ? 'text' : 'password';
       icon.textContent = wasPassword ? 'visibility_off' : 'visibility';
   
       const popup = document.getElementById('wifi-popup');
       if (popup) {
           popup.classList.add('lifted');
           wifiPopupLifted = true;
       }
   
       if (activeInput !== input) {
           activeInput = input;
           showKeyboard(input);
       }
   }
   
   async function scanWiFi() {
       const container = document.getElementById('network-list');
       const selectedDisplay = document.getElementById('selected-network');
       const err = document.getElementById('wifi-error');
       if (!container || !selectedDisplay || !err) return;
   
       try {
           const r = await fetch('/api/wifi/networks');
           const d = await r.json();
   
           if (d.success && d.networks?.length > 0) {
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
                       selectedDisplay.innerHTML = `
                           <span>${n.ssid} ${n.saved ? '<span class="badge-saved">Saved</span>' : ''}</span>
                           <span class="material-icons arrow">arrow_drop_down</span>
                       `;
                       container.style.display = 'none';
                       selectedDisplay.classList.remove('open');
                       togglePasswordField();
   
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
       const pass = document.getElementById('password')?.value;
       const err = document.getElementById('wifi-error');
   
       if (!loading || !err) return;
   
       loading.style.display = 'block';
   
       if (!selectedSSID || !pass) {
           err.innerHTML = '<span class="material-icons">error</span> Provide SSID & Password';
           err.className = 'error';
           err.style.display = 'flex';
           loading.style.display = 'none';
           return;
       }
   
       try {
           const r = await fetch('/api/wifi/connect', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ ssid: selectedSSID, password: pass })
           });
           const d = await r.json();
   
           err.className = d.success ? 'success' : 'error';
           err.innerHTML = `<span class="material-icons">${d.success ? 'check_circle' : 'error'}</span> ${d.success ? 'Connected!' : d.error || 'Connection failed'}`;
           err.style.display = 'flex';
   
           if (d.success) {
               setTimeout(async () => {
                   closeWiFiPopup();
                   await refreshWifiStatus();   // ← important: refresh everything including warning
               }, 1800);
           }
       } catch (e) {
           err.innerHTML = '<span class="material-icons">error</span> Connection failed';
           err.className = 'error';
           err.style.display = 'flex';
       } finally {
           loading.style.display = 'none';
           refreshWifiStatus();   // immediate feedback
       }
   }
   
   async function disconnectWiFi() {
       const err = document.getElementById('wifi-error');
       const loading = document.getElementById('wifi-loading');
   
       if (!loading || !err) return;
   
       loading.style.display = 'block';
   
       try {
           const r = await fetch('/api/wifi/disconnect', { method: 'POST' });
           const d = await r.json();
   
           err.className = d.success ? 'success' : 'error';
           err.innerHTML = `<span class="material-icons">${d.success ? 'check_circle' : 'error'}</span> ${d.success ? 'Disconnected' : d.error || 'Disconnect failed'}`;
           err.style.display = 'flex';
   
           if (d.success) {
               setTimeout(async () => {
                   closeWiFiPopup();
                   await refreshWifiStatus();   // ← refresh including warning
               }, 1200);
           }
       } catch (e) {
           err.innerHTML = '<span class="material-icons">error</span> Disconnect failed';
           err.className = 'error';
           err.style.display = 'flex';
       } finally {
           loading.style.display = 'none';
           refreshWifiStatus();
       }
   }
   
   function closeWiFiPopup() {
       lowerWiFiPopup();
       ['wifi-popup', 'wifi-overlay'].forEach(id => {
           const el = document.getElementById(id);
           if (el) el.remove();
       });
       hideKeyboard();
   }
   
   // Spinner animation
   if (!document.getElementById('wifi-spinner-style')) {
       const style = document.createElement('style');
       style.id = 'wifi-spinner-style';
       style.textContent = `
           @keyframes spin {
               0% { transform: rotate(0deg); }
               100% { transform: rotate(360deg); }
           }
       `;
       document.head.appendChild(style);
   }
   
   // ────────────────────────────────────────────────
   // Centralized Wi-Fi Status + Warning
   // ────────────────────────────────────────────────
   
   async function refreshWifiStatus() {
       try {
           const res = await fetch('/api/current_wifi');
           const data = await res.json();
   
           const isConnected = data.success && !!data.ssid;
   
           // Update UI elements
           updateMainDashboardWiFiStatus();
           updateBottomBarWiFiStatus();
   
           // Show/hide full-screen warning
           updateWifiDisconnectedWarning(isConnected);
   
       } catch (err) {
           console.warn("Wi-Fi status refresh failed", err);
           updateWifiDisconnectedWarning(false);
       }
   }
   
   async function updateMainDashboardWiFiStatus() {
       const statusEl = document.getElementById('bar-wifi-status');
       if (!statusEl) return;
   
       try {
           const res = await fetch('/api/current_wifi');
           const data = await res.json();
   
           let icon = 'wifi_off';
           let iconColor = '#000000ff';
           let textColor = '#000000ff';
           let backgroundColor = '#f1f3f4';
           let text = 'Disconnected';
   
           if (data.success && data.ssid) {
               icon = 'wifi';
               iconColor = '#4caf50';
               text = data.ssid;
           }
   
           statusEl.innerHTML = `
               <button class="bar-btn" id="bar-btn-wifi" style="background-color:${backgroundColor};" onclick="showWiFiPopup()">
                   <span style="color:${textColor}; max-width:350px; overflow:hidden; text-overflow:ellipsis; display:inline-block; vertical-align:middle;">
                       ${text}  
                   </span>
                   <span class="material-icons" style="color:${iconColor}; font-size:28px; vertical-align:middle;">${icon}</span>
               </button>
           `;
       } catch (e) {
           statusEl.innerHTML = `
               <button class="bar-btn" id="bar-btn-wifi" style="background-color:#f1f3f4;" onclick="showWiFiPopup()">
                   <span style="color:#000000ff; vertical-align:middle;">Disconnected  </span>
                   <span class="material-icons" style="color:#000000ff; font-size:28px; vertical-align:middle;">wifi_off</span>
               </button>
           `;
       }
   }
   
   async function updateBottomBarWiFiStatus() {
       const bottomBars = document.getElementById("bottom-bar-right");
       if (!bottomBars) return;
   
       let icon = "wifi_off";
       let iconColor = "#070808";
       let textColor = "#070808";
       let text = "Disconnected";
   
       try {
           const res = await fetch("/api/current_wifi");
           if (!res.ok) throw new Error("Network error");
           const data = await res.json();
   
           if (data.success && data.ssid) {
               icon = "wifi";
               iconColor = "#4caf50";
               text = data.ssid;
           }
       } catch (e) {
           console.warn("Wi-Fi status fetch failed:", e);
       }
   
       let wifiBtn = document.getElementById("bar-btn-wifi");
   
       if (!wifiBtn) {
           bottomBars.insertAdjacentHTML(
               "beforeend",
               `
               <button class="bar-btn" id="bar-btn-wifi" onclick="showWiFiPopup()">
                   <span class="wifi-text"></span>
                   <span>   </span>
                   <span class="material-icons"></span>
               </button>
               `
           );
           wifiBtn = document.getElementById("bar-btn-wifi");
       }
   
       const textEl = wifiBtn.querySelector(".wifi-text");
       const iconEl = wifiBtn.querySelector(".material-icons");
   
       textEl.style.color = textColor;
       iconEl.style.color = iconColor;
       iconEl.style.fontSize = "28px";
   
       textEl.textContent = `${text} `;
       textEl.style.maxWidth = "350px";
       textEl.style.overflow = "hidden";
       textEl.style.textOverflow = "ellipsis";
       textEl.style.whiteSpace = "nowrap";
       textEl.style.display = "inline-block";
   
       iconEl.textContent = icon;
   }
   
   let wifiPollingInterval = null;
   
   function startWiFiStatusPolling() {
       if (wifiPollingInterval) clearInterval(wifiPollingInterval);
   
       // Initial refresh (includes warning check)
       refreshWifiStatus();
   
       wifiPollingInterval = setInterval(refreshWifiStatus, 12000);
   }
   
   function stopWiFiStatusPolling() {
       if (wifiPollingInterval) {
           clearInterval(wifiPollingInterval);
           wifiPollingInterval = null;
       }
   }
   
   // ────────────────────────────────────────────────
   // Init
   // ────────────────────────────────────────────────
   
   document.addEventListener('DOMContentLoaded', () => {
       startWiFiStatusPolling();
   });
   
   // (your showMeterIdPopup function remains unchanged)