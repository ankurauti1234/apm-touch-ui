// ────────────────────────────────────────────────
// Wi-Fi Disconnected Warning (only visible in screensaver)
let wifiWarningElement = null;
let wifiCheckInterval = null;

function createWifiWarning() {
    if (wifiWarningElement) return;

    wifiWarningElement = document.createElement('div');
    wifiWarningElement.id = 'screensaver-wifi-warning';
    
    Object.assign(wifiWarningElement.style, {
        position: 'absolute',
        bottom: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
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

    const target = document.getElementById('clock-wrapper') || document.getElementById('screensaver');
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
    const saver = document.getElementById('screensaver');
    if (!saver || saver.style.visibility !== 'visible' || saver.style.opacity < '0.9') {
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
        console.warn('Wi-Fi status check failed:', err);
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
// Screensaver + Clock + Weather + Members layout
// ────────────────────────────────────────────────

let saver = document.getElementById('screensaver');
let wrapper;

if (!saver) {
    saver = document.createElement('div');
    saver.id = 'screensaver';
    Object.assign(saver.style, {
        position: 'fixed',
        inset: '0',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'black',
        zIndex: '2147483647',
        pointerEvents: 'all',
        touchAction: 'none',
        userSelect: 'none',
        color: 'white',
        opacity: '0',
        transition: 'opacity 1s ease',
        visibility: 'hidden',
    });
    document.body.appendChild(saver);

    // Main content wrapper
    wrapper = document.createElement('div');
    wrapper.id = 'clock-wrapper';
    Object.assign(wrapper.style, {
        width: '100%',
        maxWidth: '1600px',
        height: '90%',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 5vw',
        gap: '60px',
        boxSizing: 'border-box',
    });

    // LEFT COLUMN: Clock + Date + Weather
    const leftColumn = document.createElement('div');
    Object.assign(leftColumn.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        minWidth: '500px',
        flexShrink: 0,
    });

    const timeEl = document.createElement('div');
    timeEl.id = 'clock-time';
    Object.assign(timeEl.style, {
        fontSize: '140px',
        fontWeight: '700',
        lineHeight: '1',
        letterSpacing: '-4px',
    });

    const dateEl = document.createElement('div');
    dateEl.id = 'clock-date';
    Object.assign(dateEl.style, {
        fontSize: '48px',
        fontWeight: '400',
        marginTop: '20px',
        opacity: '0.9',
    });

    const weatherEl = document.createElement('div');
    weatherEl.id = 'weather-status';
    Object.assign(weatherEl.style, {
        marginTop: '80px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '28px',
        color: '#a0d8ef',
        opacity: '0',
        transition: 'opacity 0.7s ease',
        pointerEvents: 'none',
    });

    leftColumn.appendChild(timeEl);
    leftColumn.appendChild(dateEl);
    leftColumn.appendChild(weatherEl);

    // RIGHT COLUMN: Members grid (3 columns)
    const rightColumn = document.createElement('div');
    Object.assign(rightColumn.style, {
        flex: '1',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        height: '100%',
    });

    const membersGrid = document.createElement('div');
    membersGrid.id = 'screensaver-members';
    Object.assign(membersGrid.style, {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '40px 60px',
        justifyItems: 'center',
        maxWidth: '900px',
    });

    rightColumn.appendChild(membersGrid);

    wrapper.appendChild(leftColumn);
    wrapper.appendChild(rightColumn);
    saver.appendChild(wrapper);

    // No active members warning (fullscreen overlay)
    const warningMsg = document.createElement('div');
    warningMsg.id = 'screensaver-warning';
    Object.assign(warningMsg.style, {
        position: 'absolute',
        inset: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '42px',
        fontWeight: '600',
        textAlign: 'center',
        padding: '0 10%',
        lineHeight: '1.4',
        background: 'rgba(200,0,0,0.7)',
        color: 'white',
        display: 'none',
    });
    warningMsg.innerHTML = `
        No active members! Please activate at least one.<br><br>
        Ակտիվ անդամներ չկան! Խնդրում ենք ակտիվացնել առնվազն մեկին.
    `;
    saver.appendChild(warningMsg);
}

// ── Clock update ────────────────────────────────────────
function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const weekday = now.toLocaleDateString('en-IN', { weekday: 'short' });
    const day = now.getDate();
    const month = now.toLocaleDateString('en-IN', { month: 'short' });
    const year = now.getFullYear();
    const dateStr = `${weekday}, ${day} ${month} ${year}`;

    document.getElementById('clock-time').textContent = time;
    document.getElementById('clock-date').textContent = dateStr;
}

setInterval(updateClock, 1000);
updateClock();

// ── Weather fetch ────────────────────────────────────────
async function fetchWeather() {
    try {
        const res = await fetch(
            'https://api.open-meteo.com/v1/forecast?latitude=40.18&longitude=44.51&current=temperature_2m,weather_code&timezone=Asia/Yerevan'
        );
        const data = await res.json();
        const current = data.current;
        const temp = Math.round(current.temperature_2m);
        const code = current.weather_code;

        let icon = '/static/assets/sunny.png';
        let condition = 'Sunny';
        if (code >= 1 && code <= 3) { icon = '/static/assets/sunny.png'; condition = 'Sunny'; }
        else if (code <= 48)       { icon = '/static/assets/cloudy.png'; condition = 'Cloudy'; }
        else if (code <= 67)       { icon = '/static/assets/rainy.png';  condition = 'Rainy'; }
        else if (code <= 77)       { icon = '/static/assets/snow.png';   condition = 'Snowy'; }
        else if (code <= 99)       { icon = '/static/assets/thunderstrom.png'; condition = 'Thunderstorm'; }

        const weatherEl = document.getElementById('weather-status');
        weatherEl.innerHTML = `
            <div style="display:flex; align-items:center; gap:16px;">
                <img src="${icon}" alt="${condition}" style="width:90px; height:90px;" />
                <span style="font-size:72px; font-weight:600;">${temp}°C</span>
            </div>
            <div style="font-size:34px; opacity:0.9; margin-top:8px;">
                Yerevan, ${condition}
            </div>
        `;
        weatherEl.style.opacity = '0.92';
    } catch (err) {
        console.error('Weather fetch failed:', err);
        const weatherEl = document.getElementById('weather-status');
        weatherEl.innerHTML = '<div style="font-size:28px; opacity:0.7;">Weather unavailable</div>';
        weatherEl.style.opacity = '0.7';
    }
}

// Periodic weather refresh
let weatherRefreshInterval = null;
function startWeatherRefresh() {
    if (weatherRefreshInterval) return;
    fetchWeather();
    weatherRefreshInterval = setInterval(fetchWeather, 30 * 60 * 1000);
}
startWeatherRefresh();

// ── Inactivity reminder every 20 min ─────────────────────
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
            fetchWeather();
        } else {
            document.getElementById('weather-status')?.style.setProperty('opacity', '0');
        }
    }
}

function showInactivityWarning() {
    console.log(`[Inactivity reminder] ${new Date().toLocaleString()}`);
    let msg = document.getElementById('inactivity-warning');
    if (!msg) {
        msg = document.createElement('div');
        msg.id = 'inactivity-warning';
        // ... (keep your original inactivity warning styling and content)
        // For brevity I'm not repeating the full HTML here — copy from your original if needed
        saver.appendChild(msg);
    }
    // ... show logic (fade in, timeout fade out after 30s)
}

function hideInactivityWarning() {
    const msg = document.getElementById('inactivity-warning');
    if (msg) {
        // ... hide logic
    }
}

// ── Show / Hide screensaver ──────────────────────────────
function showScreensaver() {
    saver.style.visibility = 'visible';
    saver.style.opacity = '1';
    startWifiCheckInSaver();
    startWeatherRefresh();

    if (window.Screensaver && membersData?.members) {
        Screensaver.setMembers(membersData.members);
    }
}

function hideScreensaver() {
    saver.style.opacity = '0';
    setTimeout(() => { saver.style.visibility = 'hidden'; }, 1000);
    stopWifiCheckInSaver();
}

// ── Members display ──────────────────────────────────────
function updateScreensaverMembers(members = []) {
    const grid    = document.getElementById('screensaver-members');
    const warning = document.getElementById('screensaver-warning');
    const weather = document.getElementById('weather-status');

    if (!grid || !warning) return;

    grid.innerHTML = '';

    const active = members.filter(m => m.active === true);
    resetReminderTimer(active);

    if (active.length === 0) {
        saver.style.background = 'red';
        // blinking class if you still use it
        wrapper.style.display = 'none';
        warning.style.display = 'flex';
        if (weather) weather.style.opacity = '0';
        hideInactivityWarning();
    } else {
        saver.style.background = 'black';
        wrapper.style.display = 'flex';
        warning.style.display = 'none';
        if (weather) weather.style.opacity = '0.92';
        fetchWeather();

        active.forEach(m => {
            const item = document.createElement('div');
            Object.assign(item.style, {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
            });

            const avatar = document.createElement('div');
            Object.assign(avatar.style, {
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                backgroundImage: `url(${m.avatar})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
            });

            const name = document.createElement('div');
            Object.assign(name.style, {
                fontSize: '30px',
                fontWeight: '600',
                textAlign: 'center',
                maxWidth: '180px',
                wordBreak: 'break-word',
                textShadow: '0 2px 6px #000',
            });
            name.textContent = m.name || m.member_code || 'Unknown';

            item.appendChild(avatar);
            item.appendChild(name);
            grid.appendChild(item);
        });
    }
}

window.Screensaver = {
    show: showScreensaver,
    hide: hideScreensaver,
    setMembers: updateScreensaverMembers
};

// You can add the rest (pre-dim, brightness, event blocking, etc.) from your original code