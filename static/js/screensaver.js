// ────────────────────────────────────────────────
// Wi-Fi Disconnected Warning (only visible in screensaver)
// ────────────────────────────────────────────────
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

    const target = document.getElementById('clock-wrapper') || document.getElementById('ss-active') || saver;
    if (target) target.appendChild(wifiWarningElement);
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
        console.warn('Wi-Fi check failed in screensaver:', err);
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
// SCREENSAVER - two modes (no members vs members active)
// ────────────────────────────────────────────────

let saver = document.getElementById('screensaver');
let activeModeContainer;
let noMembersModeContainer;
let clockInterval = null;
let screensaverTimeout;
let preDimTimeout;
let isDimmed = false;
let originalBrightness = null;

if (!saver) {
    saver = document.createElement('div');
    saver.id = 'screensaver';
    Object.assign(saver.style, {
        position: 'fixed', inset: '0',
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'black',
        zIndex: '2147483647',
        pointerEvents: 'all',
        touchAction: 'none',
        userSelect: 'none',
        color: 'white',
        opacity: '0',
        transition: 'opacity 1.2s ease',
        visibility: 'hidden',
        outline: 'none',
    });
    document.body.appendChild(saver);

    // ── Active members mode ──
    activeModeContainer = document.createElement('div');
    activeModeContainer.id = 'ss-active';
    Object.assign(activeModeContainer.style, {
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        position: 'relative', gap: '30px',
    });

    const clockWrapper = document.createElement('div');
    clockWrapper.id = 'clock-wrapper';
    Object.assign(clockWrapper.style, {
        position: 'relative', width: '100%',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
    });

    const timeEl = document.createElement('div');
    timeEl.id = 'clock-time';
    timeEl.style.fontSize = '120px';
    timeEl.style.fontWeight = '700';
    timeEl.style.lineHeight = '1';
    timeEl.style.marginRight = '420px';

    const dateEl = document.createElement('div');
    dateEl.id = 'clock-date';
    dateEl.style.fontSize = '52px';
    dateEl.style.fontWeight = '400';
    dateEl.style.marginRight = '420px';
    dateEl.style.marginTop = '20px';

    const weatherEl = document.createElement('div');
    weatherEl.id = 'weather-status';
    Object.assign(weatherEl.style, {
        position: 'absolute', right: '80px', top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '30px', color: '#a0d8ef',
        display: 'flex', alignItems: 'center', gap: '16px',
        minWidth: '320px',
        opacity: '0', transition: 'opacity 0.7s ease',
        pointerEvents: 'none', zIndex: '5',
    });

    clockWrapper.append(timeEl, dateEl, weatherEl);

    const membersRow = document.createElement('div');
    membersRow.id = 'screensaver-members';
    Object.assign(membersRow.style, {
        display: 'flex', gap: '32px', marginTop: '50px',
        flexWrap: 'wrap', justifyContent: 'center', maxWidth: '92%',
    });

    activeModeContainer.append(clockWrapper, membersRow);

    // ── No active members mode ──
    noMembersModeContainer = document.createElement('div');
    noMembersModeContainer.id = 'ss-no-members';
    Object.assign(noMembersModeContainer.style, {
        textAlign: 'center', padding: '60px 40px', maxWidth: '88%',
    });

    const bigWarn = document.createElement('div');
    bigWarn.style.fontSize = '80px';
    bigWarn.style.fontWeight = 'bold';
    bigWarn.style.lineHeight = '1.2';
    bigWarn.style.marginBottom = '60px';
    bigWarn.textContent = 'No active members!';

    const subWarn = document.createElement('div');
    subWarn.style.fontSize = '48px';
    subWarn.style.lineHeight = '1.5';
    subWarn.innerHTML = `
        Please declare your individual profile.<br><br>
        Ակտիվ դիտորդներ չկան!<br>
        Հաշվի ակտիվացումը պարտադիր է համակարգից օգտվելու համար.
    `;

    noMembersModeContainer.append(bigWarn, subWarn);

    saver.append(activeModeContainer, noMembersModeContainer);
}

// ────────────────────────────────────────────────
// Clock
// ────────────────────────────────────────────────
function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const weekday = now.toLocaleDateString('en-IN', {weekday:'short'});
    const day = now.getDate();
    const month = now.toLocaleDateString('en-IN', {month:'short'});
    const year = now.getFullYear();
    const dateStr = `${weekday}, ${day} ${month} ${year}`;

    document.getElementById('clock-time')?.textContent = time;
    document.getElementById('clock-date')?.textContent = dateStr;
}

// ────────────────────────────────────────────────
// Weather fetch
// ────────────────────────────────────────────────
async function fetchWeather() {
    const weatherEl = document.getElementById('weather-status');
    if (!weatherEl) return;

    let lat = 40.18, lon = 44.51, displayName = "Yerevan";

    try {
        const saved = localStorage.getItem('weatherLocation');
        if (saved) {
            const loc = JSON.parse(saved);
            if (loc.lat && loc.lon) {
                lat = loc.lat; lon = loc.lon; displayName = loc.name;
            }
        }
    } catch (e) {}

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Weather API failed");

        const data = await res.json();
        const current = data.current;
        const temp = Math.round(current.temperature_2m);
        const code = current.weather_code;
        const isDay = current.is_day === 1;

        let icon = '/static/assets/sunny.png';
        let condition = 'Clear';

        if (code === 0) {
            icon = isDay ? '/static/assets/sunny.png' : '/static/assets/clear-night.png';
            condition = isDay ? 'Sunny' : 'Clear';
        } else if (code === 1) {
            icon = isDay ? '/static/assets/sunny.png' : '/static/assets/clear-night.png';
            condition = isDay ? 'Mainly Sunny' : 'Mainly Clear';
        } else if (code === 2) {
            icon = isDay ? '/static/assets/partly-cloudy.png' : '/static/assets/partly-cloudy-night.png';
            condition = 'Partly Cloudy';
        } else if (code === 3) {
            icon = '/static/assets/cloudy.png';
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
            icon = '/static/assets/rainy.png';
            condition = code >= 95 ? 'Thunderstorm' : 'Showers';
        }

        weatherEl.innerHTML = `
            <div>
                <div style="font-weight:600; display:flex; align-items:center; gap:16px;">
                    <img src="${icon}" alt="${condition}" style="width:80px; height:80px;" />
                    <span style="font-size:64px;">${temp}°C</span>
                </div>
                <div style="font-size:32px; opacity:0.9; margin-top:8px;">
                    ${displayName}, ${condition}
                </div>
            </div>
        `;
        weatherEl.style.opacity = '0.92';
    } catch (err) {
        console.error('Weather fetch failed:', err);
        weatherEl.innerHTML = `<div style="font-size:28px; opacity:0.7;">Weather unavailable</div>`;
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

// ────────────────────────────────────────────────
// Inactivity reminder every 20 minutes for same members
// ────────────────────────────────────────────────
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
            const weatherEl = document.getElementById('weather-status');
            if (weatherEl) weatherEl.style.opacity = '0';
        }
    }
}

function showInactivityWarning() {
    const now = new Date();
    console.log(`[REMINDER] ${now.toLocaleString()} | Same members active ≥20 min`);

    let msg = document.getElementById('inactivity-warning');
    if (!msg) {
        msg = document.createElement('div');
        msg.id = 'inactivity-warning';
        Object.assign(msg.style, {
            position: 'fixed', top: '16px', left: '16px', right: '16px',
            maxWidth: '600px', margin: '0 auto',
            background: 'rgba(32,33,36,0.92)', color: '#e0e0e0',
            borderRadius: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: '9999', display: 'none', padding: '0', opacity: '0',
            transform: 'translateY(-20px)', transition: 'all 0.4s ease',
        });

        msg.innerHTML = `
            <div style="padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center;">
                <div style="width:36px;height:36px;background:#ff9800;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;margin-right:16px;">!</div>
                <div>
                    <div style="font-size:26px;font-weight:500;color:#8ab4f8;">APM Meter</div>
                    <div style="font-size:13px;color:rgba(255,255,255,0.7);">just now</div>
                </div>
            </div>
            <div style="padding:20px;">
                <div style="font-size:30px;font-weight:500;line-height:1.4;margin-bottom:8px;">
                    The same members have been active for a long time — change them if needed.
                </div>
                <div style="font-size:30px;color:rgba(255,255,255,0.85);line-height:1.4;">
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
        setTimeout(() => msg.style.display = 'none', 400);
    }, 30000);
}

function hideInactivityWarning() {
    const msg = document.getElementById('inactivity-warning');
    if (msg) {
        msg.style.opacity = '0';
        msg.style.transform = 'translateY(-20px)';
        setTimeout(() => msg.style.display = 'none', 400);
    }
}

// ────────────────────────────────────────────────
// Update screensaver content – chooses layout
// ────────────────────────────────────────────────
function updateScreensaverMembers(members = []) {
    const activeMembers = members.filter(m => m.active === true);
    resetReminderTimer(activeMembers);

    const weatherEl = document.getElementById('weather-status');

    if (activeMembers.length === 0) {
        saver.style.background = 'red';
        saver.classList.add('blinking');
        activeModeContainer.style.display = 'none';
        noMembersModeContainer.style.display = 'flex';
        if (weatherEl) weatherEl.style.opacity = '0';
        hideInactivityWarning();

        if (clockInterval) {
            clearInterval(clockInterval);
            clockInterval = null;
        }
    } else {
        saver.style.background = 'black';
        saver.classList.remove('blinking');
        activeModeContainer.style.display = 'flex';
        noMembersModeContainer.style.display = 'none';

        if (!clockInterval) {
            clockInterval = setInterval(updateClock, 1000);
            updateClock();
        }

        if (weatherEl) {
            weatherEl.style.opacity = '0.92';
            fetchWeather();
        }

        const row = document.getElementById('screensaver-members');
        if (row) {
            row.innerHTML = '';
            activeMembers.forEach(m => {
                const cont = document.createElement('div');
                cont.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:16px;';

                const av = document.createElement('div');
                av.style.cssText = `width:130px; height:130px; border-radius:50%; background:url(${m.avatar}) center/cover; background-color:#111; box-shadow:0 6px 20px rgba(0,0,0,0.6);`;

                const name = document.createElement('div');
                name.style.cssText = 'font-size:52px; font-weight:600; text-shadow:0 3px 8px rgba(0,0,0,0.8); max-width:180px; word-break:break-word;';
                name.textContent = m.name || m.member_code || '?';

                cont.append(av, name);
                row.appendChild(cont);
            });
        }
    }
}

// ────────────────────────────────────────────────
// Show / Hide screensaver
// ────────────────────────────────────────────────
function showScreensaver() {
    saver.style.visibility = 'visible';
    saver.style.opacity = '1';

    if (membersData?.members) {
        updateScreensaverMembers(membersData.members);
    } else if (typeof fetchMembers === 'function') {
        fetchMembers().then(() => {
            if (membersData?.members) updateScreensaverMembers(membersData.members);
        });
    }

    try { saver.focus({ preventScroll: true }); } catch(e) {}
    startWifiCheckInSaver();
}

function hideScreensaver() {
    saver.style.opacity = '0';
    setTimeout(() => {
        saver.style.visibility = 'hidden';
        hideInactivityWarning();
    }, 1200);

    const weatherEl = document.getElementById('weather-status');
    if (weatherEl) weatherEl.style.opacity = '0';
    stopWifiCheckInSaver();

    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
}

// ────────────────────────────────────────────────
// Brightness control
// ────────────────────────────────────────────────
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

// ────────────────────────────────────────────────
// Screensaver timer + activity reset
// ────────────────────────────────────────────────
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

['pointerdown','pointerup','mousedown','mouseup','click',
 'touchstart','touchend','keydown','keyup','keypress'].forEach(evt => {
    document.addEventListener(evt, blockEventIfActive, { capture: true, passive: false });
});

saver.addEventListener('click', () => {
    hideScreensaver();
    resetScreensaverTimer();
}, { capture: true });

['mousemove','keypress','click','touchstart'].forEach(evt => {
    document.addEventListener(evt, () => {
        if (currentState === 'main') resetScreensaverTimer();
    }, { passive: true });
});

// ────────────────────────────────────────────────
// Export
// ────────────────────────────────────────────────
window.Screensaver = {
    show: showScreensaver,
    hide: hideScreensaver,
    setMembers: updateScreensaverMembers
};

// ────────────────────────────────────────────────
// Start periodic tasks
// ────────────────────────────────────────────────
startWeatherRefresh();

// Cleanup
window.addEventListener('beforeunload', () => {
    if (clockInterval) clearInterval(clockInterval);
    if (reminderInterval) clearInterval(reminderInterval);
    if (weatherRefreshInterval) clearInterval(weatherRefreshInterval);
    if (wifiCheckInterval) clearInterval(wifiCheckInterval);
});