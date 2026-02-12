
// ────────────────────────────────────────────────
// Wi-Fi Disconnected Warning (only visible in screensaver)
let wifiWarningElement = null;
let wifiCheckInterval = null;

function createWifiWarning() {
    if (wifiWarningElement) return; // already exists

    wifiWarningElement = document.createElement('div');
    wifiWarningElement.id = 'screensaver-wifi-warning';
    
    Object.assign(wifiWarningElement.style, {
        position: 'absolute',
        bottom: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(30, 33, 40, 0.92)',     // dark semi-transparent
        color: '#ff9800',                           // orange accent
        padding: '16px 32px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '26px',
        fontWeight: '500',
        zIndex: '100',
        opacity: '0',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        maxWidth: '90%',
        pointerEvents: 'auto',
        cursor: 'pointer',
    });

    wifiWarningElement.innerHTML = `
        <span class="material-icons" style="font-size:52px; color:#ff9800;">wifi_off</span>
        <div>
            <div style="font-size:32px; color:#ff9800; margin-bottom:4px;">
                Wi-Fi Disconnected
            </div>
            <div style="font-size:28px; color:rgba(255,255,255,0.9);">
                Please connect to continue → Tap here to open Wi-Fi settings
            </div>
        </div>
    `;

    // Tap/click → open Wi-Fi popup (assuming showWiFiPopup is global/accessible)
    wifiWarningElement.addEventListener('click', () => {
        if (typeof showWiFiPopup === 'function') {
            showWiFiPopup();
            // Optional: hide screensaver after opening popup
            // hideScreensaver();
        }
    });

    // Append to wrapper or saver — wrapper is better (centered with clock)
    const target = document.getElementById('clock-wrapper') || saver;
    target.appendChild(wifiWarningElement);
}

function showWifiWarningInSaver() {
    if (!wifiWarningElement) createWifiWarning();
    
    wifiWarningElement.style.opacity = '1';
    wifiWarningElement.style.transform = 'translateX(-50%) translateY(0)';
}

function hideWifiWarningInSaver() {
    if (!wifiWarningElement) return;
    wifiWarningElement.style.opacity = '0';
    wifiWarningElement.style.transform = 'translateX(-50%) translateY(20px)';
}

async function checkWifiInScreensaver() {
    // Only check if screensaver is actually visible
    if (saver.style.visibility !== 'visible' || saver.style.opacity < '0.9') {
        hideWifiWarningInSaver();
        return;
    }

    try {
        const res = await fetch('/api/current_wifi');
        const data = await res.json();

        if (data.success && data.ssid) {
            // Connected → hide warning
            hideWifiWarningInSaver();
        } else {
            // Disconnected → show warning
            showWifiWarningInSaver();
        }
    } catch (err) {
        // On error (network issue?) treat as disconnected
        showWifiWarningInSaver();
        console.warn('Wi-Fi status check failed in screensaver:', err);
    }
}

// Start periodic check ONLY when screensaver becomes visible
function startWifiCheckInSaver() {
    if (wifiCheckInterval) clearInterval(wifiCheckInterval);
    
    checkWifiInScreensaver(); // immediate check
    wifiCheckInterval = setInterval(checkWifiInScreensaver, 15000); // every 15 seconds
}

function stopWifiCheckInSaver() {
    if (wifiCheckInterval) {
        clearInterval(wifiCheckInterval);
        wifiCheckInterval = null;
    }
    hideWifiWarningInSaver();
}

// Hook into show/hide
const originalShowScreensaver = showScreensaver;
showScreensaver = function() {
    originalShowScreensaver();
    startWifiCheckInSaver();
};

const originalHideScreensaver = hideScreensaver;
hideScreensaver = function() {
    originalHideScreensaver();
    stopWifiCheckInSaver();
};

// Cleanup on unload
window.addEventListener('beforeunload', () => {
    stopWifiCheckInSaver();
});

/* ==============================================================
   screensaver.js
   Full screensaver + clock + pre-dim + brightness control
   FIXED & CLEAN – no syntax errors
   + Repeating 20-minute inactivity reminder for same members
   + Weather status (Yerevan, Armenia) only on screensaver when members active
   ============================================================== */

   let wrapper;
   let saver = document.getElementById('screensaver');
   if (!saver) {
       saver = document.createElement('div');
       saver.id = 'screensaver';
       Object.assign(saver.style, {
           position: 'fixed',
           left: '0', top: '0',
           width: '100%', height: '100%',
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
           margin: '0', padding: '0',
           color: 'white',
           gap: '10px',
           opacity: '0',
           transition: 'opacity 1s ease',
           visibility: 'hidden',
           outline: 'none',
       });
       saver.tabIndex = -1;
       document.body.appendChild(saver);
   
       wrapper = document.createElement('div');
       wrapper.id = 'clock-wrapper';
       Object.assign(wrapper.style, {
           width: '100%', height: '100%',
           display: 'flex', flexDirection: 'column',
           justifyContent: 'center', alignItems: 'center',
           position: 'relative'  // for absolute positioning of weather
       });
   
       const timeEl = document.createElement('div');
       timeEl.id = 'clock-time';
       Object.assign(timeEl.style, {
           fontSize: '100px',
           fontWeight: '600',
           lineHeight: '1',
           textAlign: 'center',
           marginRight: '400px'
       });
   
       const dateEl = document.createElement('div');
       dateEl.id = 'clock-date';
       Object.assign(dateEl.style, {
           fontSize: '50px',
           fontWeight: '400',
           textAlign: 'center',
           marginRight: '400px',
           marginBottom: '60px'
       });
   
       // Weather element – absolute positioned on right, hidden by default
       const weatherEl = document.createElement('div');
       weatherEl.id = 'weather-status';
       Object.assign(weatherEl.style, {
           position: 'absolute',
           right: '-28px',                    // adjust this % or use px (e.g. '60px')
           top: '150px',
           transform: 'translateY(-50%)',
           fontSize: '28px',
           color: '#a0d8ef',
           display: 'flex',
           alignItems: 'center',
           gap: '12px',
           minWidth: '280px',
           opacity: '0',
           transition: 'opacity 0.6s ease',
           pointerEvents: 'none',
           zIndex: '10',
           marginRight: '120px'
       });
       wrapper.appendChild(timeEl);
       wrapper.appendChild(dateEl);
       wrapper.appendChild(weatherEl);
   
       saver.appendChild(wrapper);
   }
   
   // Clock update
   function updateClock() {
       const now = new Date();
       const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
       const weekday = now.toLocaleDateString('en-IN', { weekday: 'short' });
       const day = now.getDate();
       const month = now.toLocaleDateString('en-IN', { month: 'short' });
       const year = now.getFullYear();
       const date = `${weekday}, ${day} ${month} ${year}`;
   
       document.getElementById('clock-time').textContent = time;
       document.getElementById('clock-date').textContent = date;
   }
   
   setInterval(updateClock, 1000);
   updateClock();
   
   // Fetch weather – called only when needed
   async function fetchWeather() {
    const weatherEl = document.getElementById('weather-status');
    if (!weatherEl) return;

    let lat = 40.18;
    let lon = 44.51;
    let displayName = "Yerevan";

    // Try to load user-saved location
    try {
        const saved = localStorage.getItem('weatherLocation');
        if (saved) {
            const loc = JSON.parse(saved);
            if (loc.lat && loc.lon) {
                lat = loc.lat;
                lon = loc.lon;
                displayName = loc.name;
            }
        }
    } catch (e) {
        console.warn("Invalid saved location", e);
    }

    try {
        // IMPORTANT: added is_day to the query
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Weather API error");

        const data = await response.json();
        const current = data.current;
        const temp = Math.round(current.temperature_2m);
        const weatherCode = current.weather_code;
        const isDay = current.is_day === 1;   // 1 = day, 0 = night

        let icon = '/static/assets/sunny.png';
        let condition = 'Clear';

        // ── Clear / low-cloud situations ── most important for day/night difference
        if (weatherCode === 0) {
            if (isDay) {
                icon = '/static/assets/sunny.png';
                condition = 'Sunny';
            } else {
                icon = '/static/assets/clear-night.png';   // ← prepare this icon (moon/stars)
                condition = 'Clear';
            }
        } 
        else if (weatherCode === 1) {
            if (isDay) {
                icon = '/static/assets/sunny.png';         // or mainly-sunny.png if you have it
                condition = 'Mainly Sunny';
            } else {
                icon = '/static/assets/clear-night.png';
                condition = 'Mainly Clear';
            }
        } 
        else if (weatherCode === 2) {
            if (isDay) {
                icon = '/static/assets/partly-cloudy.png'; // ← recommended to have separate day/night
                condition = 'Partly Cloudy';
            } else {
                icon = '/static/assets/partly-cloudy-night.png';
                condition = 'Partly Cloudy';
            }
        } 
        else if (weatherCode === 3) {
            icon = '/static/assets/cloudy.png';
            condition = 'Overcast';
        }
        
        // Fog
        else if (weatherCode >= 45 && weatherCode <= 48) {
            icon = '/static/assets/fog.png';           // or cloudy.png
            condition = 'Foggy';
        }
        
        // ── Other conditions ── usually same icon day & night
        else if (weatherCode >= 51 && weatherCode <= 67) {
            icon = '/static/assets/rainy.png';
            condition = weatherCode <= 57 ? 'Drizzle' : 'Rain';
        }
        else if (weatherCode >= 71 && weatherCode <= 77) {
            icon = '/static/assets/snow.png';
            condition = 'Snow';
        }
        else if (weatherCode >= 80 && weatherCode <= 99) {
            icon = '/static/assets/rainy.png';         // or dedicated shower / thunderstorm icons
            if (weatherCode >= 95) {
                icon = '/static/assets/thunderstrom.png';
                condition = 'Thunderstorm';
            } else {
                condition = 'Showers';
            }
        }

        weatherEl.innerHTML = `
            <div>
                <div style="font-weight:600; display:flex; align-items:center; gap:12px;">
                    <img src="${icon}" alt="${condition}" style="width:78px; height:78px;" />
                    <span style="font-size:60px;">${temp}°C</span>
                </div>
                <div style="font-size:30px; opacity:0.9; margin-top:8px;">
                    ${displayName}, ${condition}
                </div>
            </div>
        `;

        weatherEl.style.opacity = '0.9';

    } catch (err) {
        console.error('Weather fetch failed:', err);
        weatherEl.innerHTML = `<div style="font-size:24px; opacity:0.7;">Weather unavailable</div>`;
        weatherEl.style.opacity = '0.7';
    }
}
   
   // ────────────────────────────────────────────────
   // Repeating reminder every 20 minutes
   let lastActiveMemberKeys = '';
   let reminderInterval = null;
   
   function resetReminderTimer(activeMembers = []) {
       const currentKeys = activeMembers
           .map(m => m.member_code || m.id || m.name || '')
           .filter(Boolean)
           .sort()
           .join('|');
   
       if (currentKeys !== lastActiveMemberKeys) {
           lastActiveMemberKeys = currentKeys;
           hideInactivityWarning();
   
           if (reminderInterval) {
               clearInterval(reminderInterval);
               reminderInterval = null;
           }
   
           if (activeMembers.length > 0) {
               setTimeout(showInactivityWarning, 20 * 60 * 1000);
               reminderInterval = setInterval(showInactivityWarning, 20 * 60 * 1000);
               // Fetch weather when members become active
               fetchWeather();
           } else {
               // Hide weather when no active members
               const weatherEl = document.getElementById('weather-status');
               if (weatherEl) weatherEl.style.opacity = '0';
           }
       }
   }
   
   function showInactivityWarning() {
       const now = new Date();
       const timestamp = now.toLocaleString('en-IN', {
           year: 'numeric', month: '2-digit', day: '2-digit',
           hour: '2-digit', minute: '2-digit', second: '2-digit',
           hour12: false
       });
   
       console.log(`[REMINDER SHOWN] ${timestamp} | Same members active for ≥20 min | Visible for 60 seconds`);
   
       let msg = document.getElementById('inactivity-warning');
       if (!msg) {
           msg = document.createElement('div');
           msg.id = 'inactivity-warning';
           Object.assign(msg.style, {
               position: 'fixed',
               top: '16px', left: '16px', right: '16px',
               maxWidth: '580px', margin: '0 auto',
               backgroundColor: 'rgba(32, 33, 36, 0.92)',
               color: '#e0e0e0',
               borderRadius: '24px',
               boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
               overflow: 'hidden',
               zIndex: '9999',
               display: 'none',
               fontFamily: 'Roboto, system-ui, sans-serif',
               padding: '0',
               opacity: '0',
               transform: 'translateY(-20px)',
               transition: 'all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
           });
   
           msg.innerHTML = `
               <div style="display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                   <div style="width:32px; height:32px; background:#ff9800; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:bold; margin-right:16px; flex-shrink:0;">
                       !
                   </div>
                   <div style="flex:1; min-width:0;">
                       <div style="font-size:25px; font-weight:500; color:#8ab4f8;">
                           APM Meter
                       </div>
                       <div style="font-size:12px; color:rgba(255,255,255,0.7);">just now</div>
                   </div>
               </div>
               <div style="padding:16px 20px;">
                   <div style="font-size:28px; font-weight:500; line-height:1.4; margin-bottom:4px;">
                       The same members have been active for a long time change them if needed.
                   </div>
                   <div style="font-size:28px; color:rgba(255,255,255,0.85); line-height:1.4;">
                       Նույն անդամները երկար ժամանակ ակտիվ են եղել, անհրաժեշտության դեպքում փոխեք նրանց
                   </div>
               </div>
           `;
   
           saver.appendChild(msg);
       }
   
       msg.style.display = 'block';
       setTimeout(() => {
           msg.style.opacity = '1';
           msg.style.transform = 'translateY(0)';
       }, 10);
   
       setTimeout(() => {
           msg.style.opacity = '0';
           msg.style.transform = 'translateY(-20px)';
           setTimeout(() => { msg.style.display = 'none'; }, 400);
       }, 30 * 1000);
   }
   
   function hideInactivityWarning() {
       const msg = document.getElementById('inactivity-warning');
       if (msg) {
           msg.style.opacity = '0';
           msg.style.transform = 'translateY(-20px)';
           setTimeout(() => { msg.style.display = 'none'; }, 400);
       }
   }
   
   window.addEventListener('beforeunload', () => {
       if (reminderInterval) clearInterval(reminderInterval);
   });
   
   // ────────────────────────────────────────────────
   function showScreensaver() {
       saver.style.visibility = 'visible';
       saver.style.opacity = '1';
   
       if (window.Screensaver && membersData?.members) {
           Screensaver.setMembers(membersData.members);
       } else if (typeof fetchMembers === 'function') {
           fetchMembers().then(() => {
               if (membersData?.members) Screensaver.setMembers(membersData.members);
           });
       }
   
       try { saver.focus({ preventScroll: true }); } catch (e) {}
   
       // Show weather when screensaver appears (if members active)
       const weatherEl = document.getElementById('weather-status');
       if (weatherEl && membersData?.members?.some(m => m.active)) {
           weatherEl.style.opacity = '0.9';
       }
   }
   
   function hideScreensaver() {
       saver.style.opacity = '0';
       setTimeout(() => { saver.style.visibility = 'hidden'; }, 1000);
   
       // Hide weather when screensaver hides
       const weatherEl = document.getElementById('weather-status');
       if (weatherEl) weatherEl.style.opacity = '0';
   }
   
   async function preDimBrightness() {
       if (isDimmed) return;
       const current = originalBrightness ?? 153;
       originalBrightness = current;
       const minBrightness = 51;
       if (current <= minBrightness + 5) return;
   
       await updateBrightnessAPI(minBrightness);
       isDimmed = true;
       console.log(`[PRE-DIM] ${current} → ${minBrightness}`);
   }
   
   async function restoreBrightness() {
       if (!isDimmed) return;
       const value = originalBrightness ?? 153;
       isDimmed = false;
       await updateBrightnessAPI(value);
       console.log(`[RESTORE] ${value}`);
   }
   
   async function updateBrightnessAPI(value) {
       const mapped = Math.round(51 + (value / 255) * (255 - 51));
       return fetch("/api/brightness", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ brightness: mapped })
       }).catch(err => console.error("Brightness API error:", err));
   }
   
   function resetScreensaverTimer() {
       clearTimeout(screensaverTimeout);
       clearTimeout(preDimTimeout);
       hideScreensaver();
       restoreBrightness();
   
       preDimTimeout = setTimeout(preDimBrightness, 20000);
       screensaverTimeout = setTimeout(showScreensaver, 20000);
   }
   
   function blockEventIfActive(e) {
       if (saver.style.visibility === 'visible' && saver.style.opacity !== '0' && !saver.contains(e.target)) {
           e.preventDefault();
           e.stopPropagation();
           e.stopImmediatePropagation();
       }
   }
   
   ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click',
    'touchstart', 'touchend', 'keydown', 'keyup', 'keypress'].forEach(evt => {
       document.addEventListener(evt, blockEventIfActive, { capture: true, passive: false });
   });
   
   saver.addEventListener('click', () => {
       hideScreensaver();
       resetScreensaverTimer();
   }, { capture: true });
   
   ['mousemove', 'keypress', 'click', 'touchstart'].forEach(evt => {
       document.addEventListener(evt, () => {
           if (currentState === 'main') resetScreensaverTimer();
       }, { passive: true });
   });
   
   const membersRow = document.createElement('div');
   membersRow.id = 'screensaver-members';
   Object.assign(membersRow.style, {
       display: 'flex',
       gap: '16px',
       marginTop: '30px',
       flexWrap: 'wrap',
       justifyContent: 'center'
   });
   wrapper.appendChild(membersRow);
   
   const warningMsg = document.createElement('div');
   warningMsg.id = 'screensaver-warning';
   Object.assign(warningMsg.style, {
       fontSize: '35px',
       fontWeight: 'bold',
       textAlign: 'center',
       color: 'white',
       marginTop: '20px',
       lineHeight: '1.3',
       padding: '0 20px',
       maxWidth: '90%',
       display: 'none'
   });
   warningMsg.innerHTML = `
       No active members! Please declare your individual profile.<br><br>
       Ակտիվ դիտորդներ չկան! Հաշվի ակտիվացումը պարտադիր է համակարգից օգտվելու համար.
   `;
   wrapper.appendChild(warningMsg);
   
   const styleSheet = document.createElement('style');
   styleSheet.textContent = `
       @keyframes blink {
           0% { background-color: red; }
           50% { background-color: darkred; }
           100% { background-color: red; }
       }
       .blinking { animation: blink 1s infinite; }
   `;
   document.head.appendChild(styleSheet);
   
   function updateScreensaverMembers(members = []) {
       const row = document.getElementById('screensaver-members');
       const warning = document.getElementById('screensaver-warning');
       const weatherEl = document.getElementById('weather-status');
       if (!row || !warning) return;
   
       row.innerHTML = '';  
   
       const activeMembers = members.filter(m => m.active === true);
       resetReminderTimer(activeMembers);
       
   
       if (activeMembers.length === 0) {
           saver.style.background = 'red';
           saver.classList.add('blinking');
           if (timeEl)     timeEl.style.display     = 'none';
           if (dateEl)     dateEl.style.display     = 'none';
           row.style.display = 'none';
           warning.style.display = 'block';
           hideInactivityWarning();
           if (weatherEl) weatherEl.style.opacity = '0'; // hide weather
       } else {
           saver.style.background = 'black';
           saver.classList.remove('blinking');
           row.style.display = 'flex';
           warning.style.display = 'none';
           if (weatherEl) weatherEl.style.opacity = '0.9'; // show weather
           // Fetch fresh weather when members are active
           fetchWeather();
   
           activeMembers.forEach(m => {
               const container = document.createElement('div');
               Object.assign(container.style, {
                   display: 'flex',
                   flexDirection: 'column',
                   alignItems: 'center',
                   gap: '8px',
               });
   
               const icon = document.createElement('div');
               Object.assign(icon.style, {
                   width: '110px',
                   height: '110px',
                   borderRadius: '50%',
                   backgroundImage: `url(${m.avatar})`,
                   backgroundSize: 'cover',
                   backgroundPosition: 'center',
                   backgroundColor: 'black',
                   boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
               });
   
               const label = document.createElement('div');
               Object.assign(label.style, {
                   fontSize: '50px',
                   fontWeight: '600',
                   color: 'white',
                   textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                   textAlign: 'center',
                   maxWidth: '140px',
                   wordBreak: 'break-word',
               });
               label.textContent = m.name || m.member_code || 'Unknown';
   
               container.appendChild(icon);
               container.appendChild(label);
               row.appendChild(container);
           });
       }
   }
   
   window.Screensaver = {
       show: showScreensaver,
       hide: hideScreensaver,
       setMembers: updateScreensaverMembers
   };


   //Fetch weather 

   // ────────────────────────────────────────────────
// Periodic weather refresh every 30 minutes
let weatherRefreshInterval = null;

function startWeatherRefresh() {
    if (weatherRefreshInterval) return; // already running

    // Immediate fetch + then every 30 min
    fetchWeather();

    weatherRefreshInterval = setInterval(() => {
        fetchWeather();
    }, 30 * 60 * 1000);
}

// Optional: stop when page is unloading (good practice)
window.addEventListener('beforeunload', () => {
    if (weatherRefreshInterval) {
        clearInterval(weatherRefreshInterval);
    }
    if (reminderInterval) clearInterval(reminderInterval);
});

// Start periodic weather updates right away
startWeatherRefresh();