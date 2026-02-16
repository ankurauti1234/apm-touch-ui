// ────────────────────────────────────────────────
// Wi-Fi Disconnected Warning (only visible in screensaver)
let wifiWarningElement = null;
let wifiCheckInterval = null;
let noMembersNavigationHandler = null;

function createWifiWarning() {
    if (wifiWarningElement) return;

    wifiWarningElement = document.createElement('div');
    wifiWarningElement.id = 'screensaver-wifi-warning';
    
    Object.assign(wifiWarningElement.style, {
        position: 'absolute',
        bottom: '40px',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(30, 33, 40, 0.92)',
        color: '#ff9800',
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

    wifiWarningElement.addEventListener('click', () => {
        if (typeof showWiFiPopup === 'function') {
            showWiFiPopup();
        }
    });

    const target = document.getElementById('clock-wrapper') || saver;
    target.appendChild(wifiWarningElement);
}

function showWifiWarningInSaver() {
    if (!wifiWarningElement) createWifiWarning();
    wifiWarningElement.style.opacity = '1';
    wifiWarningElement.style.transform = 'translate(-50%, -50%) scale(1)';
}

function hideWifiWarningInSaver() {
    if (!wifiWarningElement) return;
    wifiWarningElement.style.opacity = '0';
    wifiWarningElement.style.transform = 'translate(-50%, -50%) scale(0.95)';
}

async function checkWifiInScreensaver() {
    if (saver.style.visibility !== 'visible' || saver.style.opacity < '0.9') {
        hideWifiWarningInSaver();
        return;
    }

    try {
        const res = await fetch('/api/current_wifi');
        const data = await res.json();

        if (data.success && data.ssid) {
            hideWifiWarningInSaver();
        } else {
            showWifiWarningInSaver();
        }
    } catch (err) {
        showWifiWarningInSaver();
        console.warn('Wi-Fi status check failed in screensaver:', err);
    }
}

function startWifiCheckInSaver() {
    if (wifiCheckInterval) clearInterval(wifiCheckInterval);
    checkWifiInScreensaver();
    wifiCheckInterval = setInterval(checkWifiInScreensaver, 15000);
}

function stopWifiCheckInSaver() {
    if (wifiCheckInterval) {
        clearInterval(wifiCheckInterval);
        wifiCheckInterval = null;
    }
    hideWifiWarningInSaver();
}

// ────────────────────────────────────────────────
// screensaver.js — Full screensaver + clock + weather + inactivity reminder
// ────────────────────────────────────────────────

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
        position: 'relative'
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

    const weatherEl = document.createElement('div');
    weatherEl.id = 'weather-status';
    Object.assign(weatherEl.style, {
        position: 'absolute',
        right: '-28px',
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

// ────────────────────────────────────────────────
// No active members — centered dialog
let noMembersDialog = null;

function createNoMembersDialog() {
    if (noMembersDialog) return;

    noMembersDialog = document.createElement('div');
    noMembersDialog.id = 'no-members-dialog';

    Object.assign(noMembersDialog.style, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) scale(0.92)',
        width: 'min(90%, 640px)',
        background: 'rgba(30, 33, 40, 0.94)',
        borderRadius: '24px',
        boxShadow: '0 20px 70px rgba(0,0,0,0.65)',
        color: 'white',
        padding: '48px 36px',
        textAlign: 'center',
        zIndex: '200',
        opacity: '0',
        transition: 'opacity 0.5s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        pointerEvents: 'auto',
    });

    noMembersDialog.innerHTML = `
        <div style="font-size: 90px; color: #ff9800; margin-bottom: 28px; line-height: 1;">⚠️</div>
        
        <div style="font-size: 42px; font-weight: 700; margin-bottom: 24px; color: #ff9800; line-height: 1.2;">
            No Active Members!
        </div>
        
        <div style="font-size: 28px; line-height: 1.45; margin-bottom: 44px; color: rgba(255,255,255,0.93);">
            Please declare your individual profile to continue using the system.<br><br>
            Ակտիվ դիտորդներ չկան! Հաշվի ակտիվացումը պարտադիր է համակարգից օգտվելու համար:
        </div>

        <button id="go-to-members-btn" style="
            background: #ff9800;
            color: #000;
            border: none;
            padding: 20px 60px;
            font-size: 30px;
            font-weight: 700;
            border-radius: 16px;
            cursor: pointer;
            box-shadow: 0 8px 30px rgba(255,152,0,0.4);
            transition: all 0.28s ease;
        ">
            Go to Members →
        </button>
    `;

    // IMPORTANT: change this URL to your actual members / finalize / profile selection page
    noMembersDialog.querySelector('#go-to-members-btn').addEventListener('click', () => {
        window.location.href = '/members';     // ←←← CHANGE THIS PATH
        // Alternatives:
        // window.location.href = '/finalize';
        // window.location.href = '/profile/select';
    });

    wrapper.appendChild(noMembersDialog);
}

// ────────────────────────────────────────────────
// Weather fetch
async function fetchWeather() {
    const weatherEl = document.getElementById('weather-status');
    if (!weatherEl) return;

    const hasActive = membersData?.members?.some(m => m.active === true) ?? false;
    if (!hasActive) {
        weatherEl.style.opacity = '0';
        return;
    }

    let lat = 40.18;
    let lon = 44.51;
    let displayName = "Yerevan";

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
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Weather API error");

        const data = await response.json();
        const current = data.current;
        const temp = Math.round(current.temperature_2m);
        const weatherCode = current.weather_code;
        
        const apiTimeStr = current.time;
        const dt = new Date(apiTimeStr);
        const hour = dt.getHours();
        const isNight = hour >= 18;

        let icon = '/static/assets/sunny.png';
        let condition = 'Clear';

        if (weatherCode === 0) {
            icon = isNight ? '/static/assets/clear-night.png' : '/static/assets/sunny.png';
            condition = isNight ? 'Clear' : 'Sunny';
        } else if (weatherCode === 1) {
            icon = isNight ? '/static/assets/clear-night.png' : '/static/assets/sunny.png';
            condition = isNight ? 'Mainly Clear' : 'Mainly Sunny';
        } else if (weatherCode === 2) {
            icon = isNight ? '/static/assets/partly-cloudy-night.png' : '/static/assets/partly-cloudy.png';
            condition = 'Partly Cloudy';
        } else if (weatherCode === 3) {
            icon = isNight ? '/static/assets/cloudy-night.png' : '/static/assets/cloudy.png';
            condition = 'Overcast';
        } else if (weatherCode >= 45 && weatherCode <= 48) {
            icon = '/static/assets/fog.png';
            condition = 'Foggy';
        } else if (weatherCode >= 51 && weatherCode <= 67) {
            icon = '/static/assets/rainy.png';
            condition = weatherCode <= 57 ? 'Drizzle' : 'Rain';
        } else if (weatherCode >= 71 && weatherCode <= 77) {
            icon = '/static/assets/snow.png';
            condition = 'Snow';
        } else if (weatherCode >= 80 && weatherCode <= 99) {
            icon = weatherCode >= 95 ? '/static/assets/thunderstrom.png' : '/static/assets/rainy.png';
            condition = weatherCode >= 95 ? 'Thunderstorm' : 'Showers';
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
        if (hasActive) {
            weatherEl.innerHTML = `<div style="font-size:24px; opacity:0.7;">Weather unavailable</div>`;
            weatherEl.style.opacity = '0.7';
        }
    }
}

// ────────────────────────────────────────────────
// Repeating 20-minute inactivity reminder
let lastActiveMemberKeys = '';
let reminderInterval = null;
let firstReminderTimeout = null;

function resetReminderTimer(activeMembers = []) {
    const currentKeys = activeMembers
        .map(m => m.member_code || m.id || m.name || '')
        .filter(Boolean)
        .sort()
        .join('|');

    if (currentKeys !== lastActiveMemberKeys) {
        lastActiveMemberKeys = currentKeys;
        hideInactivityWarning();

        if (reminderInterval) clearInterval(reminderInterval);
        if (firstReminderTimeout) clearTimeout(firstReminderTimeout);

        if (activeMembers.length > 0) {
            firstReminderTimeout = setTimeout(showInactivityWarning, 20 * 60 * 1000);
            reminderInterval = setInterval(showInactivityWarning, 20 * 60 * 1000);
            fetchWeather();
        } else {
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

    console.log(`[REMINDER] ${timestamp} | Same members active ≥20 min`);

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
                    The same members have been active for a long time — change them if needed.
                </div>
                <div style="font-size:28px; color:rgba(255,255,255,0.85); line-height:1.4;">
                    Նույն անդամները երկար ժամանակ ակտիվ են եղել, անհրաժտության դեպքում փոխեք նրանց
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
    }, 30000);
}

function hideInactivityWarning() {
    const msg = document.getElementById('inactivity-warning');
    if (msg) {
        msg.style.opacity = '0';
        msg.style.transform = 'translateY(-20px)';
        setTimeout(() => { msg.style.display = 'none'; }, 400);
    }
}

// ────────────────────────────────────────────────
// Show / Hide screensaver
function showScreensaver() {
    saver.style.background = 'black';           // force here too
    saver.style.visibility = 'visible';
    saver.style.opacity = '1';
    saver.style.display = 'flex';               // ← sometimes helps if display:none was used elsewhere

    // Force reflow/repaint
    void saver.offsetWidth;

    if (window.Screensaver && membersData?.members) {
        Screensaver.setMembers(membersData.members);
    } else if (typeof fetchMembers === 'function') {
        fetchMembers().then(() => {
            if (membersData?.members) Screensaver.setMembers(membersData.members);
        });
    }

    try { saver.focus({ preventScroll: true }); } catch (e) {}

    const weatherEl = document.getElementById('weather-status');
    if (weatherEl && membersData?.members?.some(m => m.active)) {
        weatherEl.style.opacity = '0.9';
    }

    startWifiCheckInSaver();
}

function hideScreensaver() {
    saver.style.opacity = '0';
    setTimeout(() => {
        saver.style.visibility = 'hidden';
    }, 1000);

    const weatherEl = document.getElementById('weather-status');
    if (weatherEl) weatherEl.style.opacity = '0';

    if (noMembersNavigationHandler) {
        saver.removeEventListener('click', noMembersNavigationHandler, { capture: true });
        noMembersNavigationHandler = null;
    }

    stopWifiCheckInSaver();
}

// ────────────────────────────────────────────────
// Members display logic
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

function updateScreensaverMembers(members = []) {
    const row = document.getElementById('screensaver-members');
    const weatherEl = document.getElementById('weather-status');
    if (!row) return;

    row.innerHTML = '';

    const activeMembers = members.filter(m => m.active === true);
    resetReminderTimer(activeMembers);

    if (activeMembers.length === 0) {
        saver.style.background = '#0d1117';  // calm dark background

        row.style.display = 'none';

        const timeEl = document.getElementById('clock-time');
        const dateEl = document.getElementById('clock-date');
        if (timeEl) timeEl.style.display = 'none';
        if (dateEl) dateEl.style.display = 'none';
        if (weatherEl) weatherEl.style.opacity = '0';

        hideInactivityWarning();

        // Show dialog
        if (!noMembersDialog) createNoMembersDialog();
        noMembersDialog.style.opacity = '1';
        setTimeout(() => {
            noMembersDialog.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 20);

        // ── NEW: Make whole screensaver clickable to go to members page ──
        if (!noMembersNavigationHandler) {
            noMembersNavigationHandler = () => {
                window.location.href = '/members';   // ← same path as the button
                // or '/finalize' / whatever your real path is
            };
            saver.addEventListener('click', noMembersNavigationHandler, { capture: true });
            // capture: true → works even if clicking on dialog/button children
        }

    } else {
        saver.style.background = 'black';
        row.style.display = 'flex';

        if (noMembersDialog) {
            noMembersDialog.style.opacity = '0';
            noMembersDialog.style.transform = 'translate(-50%, -50%) scale(0.92)';
        }

        const timeEl = document.getElementById('clock-time');
        const dateEl = document.getElementById('clock-date');
        if (timeEl) timeEl.style.display = 'block';
        if (dateEl) dateEl.style.display = 'block';
        if (weatherEl) weatherEl.style.opacity = '0.9';

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

// ────────────────────────────────────────────────
// Periodic weather refresh
let weatherRefreshInterval = null;

function startWeatherRefresh() {
    if (weatherRefreshInterval) return;
    fetchWeather();
    weatherRefreshInterval = setInterval(fetchWeather, 30 * 60 * 1000);
}

startWeatherRefresh();

// Cleanup
window.addEventListener('beforeunload', () => {
    if (weatherRefreshInterval) clearInterval(weatherRefreshInterval);
    if (reminderInterval) clearInterval(reminderInterval);
    if (firstReminderTimeout) clearTimeout(firstReminderTimeout);
    if (wifiCheckInterval) clearInterval(wifiCheckInterval);
});