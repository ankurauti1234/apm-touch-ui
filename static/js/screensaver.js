// Wi-Fi Disconnected Warning (only visible in screensaver)
let wifiWarningElement = null;
let wifiCheckInterval = null;

function createWifiWarning() {
    if (wifiWarningElement) return;

    wifiWarningElement = document.createElement('div');
    wifiWarningElement.id = 'screensaver-wifi-warning';
    
    Object.assign(wifiWarningElement.style, {
        position: 'absolute',
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
// screensaver core
// ────────────────────────────────────────────────

let wrapper;
let saver = document.getElementById('screensaver');
if (!saver) {
    saver = document.createElement('div');
    saver.id = 'screensaver';
    Object.assign(saver.style, {
        position: 'fixed',
        inset: '0',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
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
    saver.tabIndex = -1;
    document.body.appendChild(saver);

    wrapper = document.createElement('div');
    wrapper.id = 'clock-wrapper';
    Object.assign(wrapper.style, {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
    });

    const timeEl = document.createElement('div');
    timeEl.id = 'clock-time';
    Object.assign(timeEl.style, {
        fontSize: '100px',
        fontWeight: '600',
        lineHeight: '1',
        textAlign: 'center',
    });

    const dateEl = document.createElement('div');
    dateEl.id = 'clock-date';
    Object.assign(dateEl.style, {
        fontSize: '50px',
        fontWeight: '400',
        textAlign: 'center',
        marginTop: '20px'
    });

    const weatherEl = document.createElement('div');
    weatherEl.id = 'weather-status';
    Object.assign(weatherEl.style, {
        position: 'absolute',
        right: '40px',
        top: '50%',
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
        zIndex: '10'
    });

    wrapper.appendChild(timeEl);
    wrapper.appendChild(dateEl);
    wrapper.appendChild(weatherEl);
    saver.appendChild(wrapper);
}

// Clock
function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    document.getElementById('clock-time').textContent = time;
    document.getElementById('clock-date').textContent = dateStr;
}

setInterval(updateClock, 1000);
updateClock();

// ────────────────────────────────────────────────
// Weather
async function fetchWeather() {
    const weatherEl = document.getElementById('weather-status');
    if (!weatherEl) return;

    const hasActive = membersData?.members?.some(m => m.active === true) ?? false;
    if (!hasActive) {
        weatherEl.style.opacity = '0';
        return;
    }

    let lat = 40.18, lon = 44.51, displayName = "Yerevan";

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
    } catch {}

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error();

        const data = await res.json();
        const current = data.current;
        const temp = Math.round(current.temperature_2m);
        const code = current.weather_code;
        const isNight = new Date(current.time).getHours() >= 18;

        let icon = '/static/assets/sunny.png';
        let condition = 'Clear';

        if (code === 0) {
            icon = isNight ? '/static/assets/clear-night.png' : '/static/assets/sunny.png';
            condition = isNight ? 'Clear' : 'Sunny';
        } else if (code === 1) {
            icon = isNight ? '/static/assets/clear-night.png' : '/static/assets/sunny.png';
            condition = isNight ? 'Mainly Clear' : 'Mainly Sunny';
        } else if (code === 2) {
            icon = isNight ? '/static/assets/partly-cloudy-night.png' : '/static/assets/partly-cloudy.png';
            condition = 'Partly Cloudy';
        } else if (code === 3) {
            icon = isNight ? '/static/assets/cloudy-night.png' : '/static/assets/cloudy.png';
            condition = 'Overcast';
        } else if (code >= 45 && code <= 48) {
            icon = '/static/assets/fog.png';
            condition = 'Foggy';
        } else if (code >= 51 && code <= 67) {
            icon = '/static/assets/rainy.png';
            condition = code <= 57 ? 'Drizzle' : 'Rain';
        } else if (code >= 71 && code <= 77) {
            icon = '/static/assets/snow.png';
            condition = 'Snow';
        } else if (code >= 80 && code <= 99) {
            icon = code >= 95 ? '/static/assets/thunderstrom.png' : '/static/assets/rainy.png';
            condition = code >= 95 ? 'Thunderstorm' : 'Showers';
        }

        weatherEl.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; font-weight:600;">
                <img src="${icon}" alt="${condition}" style="width:78px;height:78px;">
                <span style="font-size:60px;">${temp}°C</span>
            </div>
            <div style="font-size:30px; opacity:0.9; margin-top:8px;">
                ${displayName}, ${condition}
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
// 20-minute inactivity reminder
let lastActiveMemberKeys = '';
let reminderInterval = null;
let firstReminderTimeout = null;

function resetReminderTimer(activeMembers = []) {
    const keys = activeMembers
        .map(m => m.member_code || m.id || m.name || '')
        .filter(Boolean)
        .sort()
        .join('|');

    if (keys !== lastActiveMemberKeys) {
        lastActiveMemberKeys = keys;
        hideInactivityWarning();

        if (reminderInterval) clearInterval(reminderInterval);
        if (firstReminderTimeout) clearTimeout(firstReminderTimeout);

        if (activeMembers.length > 0) {
            firstReminderTimeout = setTimeout(showInactivityWarning, 20 * 60 * 1000);
            reminderInterval = setInterval(showInactivityWarning, 20 * 60 * 1000);
            fetchWeather();
        } else {
            document.getElementById('weather-status')?.style.setProperty('opacity', '0');
        }
    }
}

function showInactivityWarning() {
    let msg = document.getElementById('inactivity-warning');
    if (!msg) {
        msg = document.createElement('div');
        msg.id = 'inactivity-warning';
        Object.assign(msg.style, {
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: '90%',
            width: '580px',
            background: 'rgba(32,33,36,0.92)',
            color: '#e0e0e0',
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: '9999',
            opacity: '0',
            transform: 'translate(-50%, -20px)',
            transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
        });

        msg.innerHTML = `
            <div style="padding:16px 20px;">
                <div style="font-size:28px; font-weight:500; line-height:1.4; margin-bottom:8px; color:#ff9800;">
                    Inactivity Reminder
                </div>
                <div style="font-size:26px; line-height:1.4;">
                    The same members have been active for a long time — change them if needed.
                </div>
                <div style="font-size:26px; color:rgba(255,255,255,0.85); margin-top:12px;">
                    Նույն անդամները երկար ժամանակ ակտիվ են եղել, անհրաժտության դեպքում փոխեք նրանց
                </div>
            </div>
        `;
        saver.appendChild(msg);
    }

    msg.style.display = 'block';
    setTimeout(() => {
        msg.style.opacity = '1';
        msg.style.transform = 'translate(-50%, 0)';
    }, 10);

    setTimeout(() => {
        msg.style.opacity = '0';
        msg.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => msg.style.display = 'none', 400);
    }, 30000);
}

function hideInactivityWarning() {
    const msg = document.getElementById('inactivity-warning');
    if (msg) {
        msg.style.opacity = '0';
        msg.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => msg.style.display = 'none', 400);
    }
}

// ────────────────────────────────────────────────
// Show / Hide
function showScreensaver() {
    saver.style.visibility = 'visible';
    saver.style.opacity = '1';

    if (window.Screensaver && membersData?.members) {
        window.Screensaver.setMembers(membersData.members);
    } else if (typeof fetchMembers === 'function') {
        fetchMembers().then(() => {
            if (membersData?.members) window.Screensaver.setMembers(membersData.members);
        });
    }

    try { saver.focus({ preventScroll: true }); } catch {}

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

    document.getElementById('weather-status')?.style.setProperty('opacity', '0');
    stopWifiCheckInSaver();
}

// ────────────────────────────────────────────────
// Members display
const membersRow = document.createElement('div');
membersRow.id = 'screensaver-members';
Object.assign(membersRow.style, {
    display: 'flex',
    gap: '24px',
    marginTop: '40px',
    flexWrap: 'wrap',
    justifyContent: 'center'
});
wrapper.appendChild(membersRow);

function updateScreensaverMembers(members = []) {
    const row = document.getElementById('screensaver-members');
    const weatherEl = document.getElementById('weather-status');
    if (!row) return;

    row.innerHTML = '';

    const active = members.filter(m => m.active === true);
    resetReminderTimer(active);

    if (active.length === 0) {
        // You can add your new no-members dialog / message logic here later
        // For now we just hide clock + members + weather
        document.getElementById('clock-time')?.style.setProperty('display', 'none');
        document.getElementById('clock-date')?.style.setProperty('display', 'none');
        weatherEl?.style.setProperty('opacity', '0');
        row.style.display = 'none';
    } else {
        document.getElementById('clock-time')?.style.setProperty('display', 'block');
        document.getElementById('clock-date')?.style.setProperty('display', 'block');
        weatherEl?.style.setProperty('opacity', '0.9');
        row.style.display = 'flex';
        fetchWeather();

        active.forEach(m => {
            const div = document.createElement('div');
            Object.assign(div.style, {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
            });

            const avatar = document.createElement('div');
            Object.assign(avatar.style, {
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                background: `url(${m.avatar || '/static/placeholder.png'}) center/cover`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
            });

            const name = document.createElement('div');
            Object.assign(name.style, {
                fontSize: '48px',
                fontWeight: '600',
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                maxWidth: '180px',
                textAlign: 'center',
                wordBreak: 'break-word'
            });
            name.textContent = m.name || m.member_code || '—';

            div.append(avatar, name);
            row.appendChild(div);
        });
    }
}

window.Screensaver = {
    show: showScreensaver,
    hide: hideScreensaver,
    setMembers: updateScreensaverMembers
};

// Periodic weather
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