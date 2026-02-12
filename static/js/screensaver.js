// ────────────────────────────────────────────────
// Wi-Fi Disconnected Warning (only visible in screensaver)
// (your original Wi-Fi code remains unchanged)
// ────────────────────────────────────────────────
let wifiWarningElement = null;
let wifiCheckInterval = null;

// ... keep your createWifiWarning, showWifiWarningInSaver, hideWifiWarningInSaver,
// checkWifiInScreensaver, startWifiCheckInSaver, stopWifiCheckInSaver functions exactly as they were ...

// ────────────────────────────────────────────────
// SCREENSAVER – TWO MODES
// ────────────────────────────────────────────────

let saver = document.getElementById('screensaver');
let activeModeContainer;
let noMembersModeContainer;
let clockInterval = null;

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
        outline: 'none',
    });
    document.body.appendChild(saver);

    // ── ACTIVE MEMBERS MODE (clock + weather + avatars) ──
    activeModeContainer = document.createElement('div');
    activeModeContainer.id = 'ss-active';
    Object.assign(activeModeContainer.style, {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        gap: '20px',
    });

    const clockWrapper = document.createElement('div');
    clockWrapper.id = 'clock-wrapper';
    Object.assign(clockWrapper.style, {
        position: 'relative',
        width: '100%',
        height: '60%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    });

    const timeEl = document.createElement('div');
    timeEl.id = 'clock-time';
    Object.assign(timeEl.style, {
        fontSize: '100px',
        fontWeight: '600',
        lineHeight: '1',
        marginRight: '400px',
    });

    const dateEl = document.createElement('div');
    dateEl.id = 'clock-date';
    Object.assign(dateEl.style, {
        fontSize: '50px',
        fontWeight: '400',
        marginRight: '400px',
        marginBottom: '60px',
    });

    const weatherEl = document.createElement('div');
    weatherEl.id = 'weather-status';
    Object.assign(weatherEl.style, {
        position: 'absolute',
        right: '60px',
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
        zIndex: '10',
    });

    clockWrapper.appendChild(timeEl);
    clockWrapper.appendChild(dateEl);
    clockWrapper.appendChild(weatherEl);

    const membersRow = document.createElement('div');
    membersRow.id = 'screensaver-members';
    Object.assign(membersRow.style, {
        display: 'flex',
        gap: '24px',
        marginTop: '40px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '90%',
    });

    activeModeContainer.appendChild(clockWrapper);
    activeModeContainer.appendChild(membersRow);

    // ── NO ACTIVE MEMBERS MODE (only big warning) ──
    noMembersModeContainer = document.createElement('div');
    noMembersModeContainer.id = 'ss-no-members';
    Object.assign(noMembersModeContainer.style, {
        textAlign: 'center',
        padding: '40px',
        maxWidth: '85%',
    });

    const warningTitle = document.createElement('div');
    warningTitle.style.fontSize = '72px';
    warningTitle.style.fontWeight = 'bold';
    warningTitle.style.marginBottom = '40px';
    warningTitle.style.lineHeight = '1.2';
    warningTitle.innerHTML = 'No active members!';

    const warningText = document.createElement('div');
    warningText.style.fontSize = '42px';
    warningText.style.lineHeight = '1.5';
    warningText.innerHTML = `
        Please declare your individual profile.<br><br>
        Ակտիվ դիտորդներ չկան!<br>
        Հաշվի ակտիվացումը պարտադիր է համակարգից օգտվելու համար.
    `;

    noMembersModeContainer.appendChild(warningTitle);
    noMembersModeContainer.appendChild(warningText);

    // Append both containers
    saver.appendChild(activeModeContainer);
    saver.appendChild(noMembersModeContainer);
}

// ────────────────────────────────────────────────
// Clock (only runs in active mode)
// ────────────────────────────────────────────────
function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const weekday = now.toLocaleDateString('en-IN', { weekday: 'short' });
    const day = now.getDate();
    const month = now.toLocaleDateString('en-IN', { month: 'short' });
    const year = now.getFullYear();
    const dateStr = `${weekday}, ${day} ${month} ${year}`;

    document.getElementById('clock-time')?.textContent = time;
    document.getElementById('clock-date')?.textContent = dateStr;
}

// ────────────────────────────────────────────────
// Main update logic – decides which mode to show
// ────────────────────────────────────────────────
function updateScreensaverMembers(members = []) {
    const activeMembers = members.filter(m => m.active === true);
    resetReminderTimer(activeMembers); // your 20-min reminder logic

    const weatherEl = document.getElementById('weather-status');

    if (activeMembers.length === 0) {
        // NO MEMBERS MODE
        saver.style.background = 'red';
        saver.classList.add('blinking');

        activeModeContainer.style.display = 'none';
        noMembersModeContainer.style.display = 'flex';

        if (weatherEl) weatherEl.style.opacity = '0';
        hideInactivityWarning();

        // Stop clock
        if (clockInterval) {
            clearInterval(clockInterval);
            clockInterval = null;
        }
    } else {
        // ACTIVE MEMBERS MODE
        saver.style.background = 'black';
        saver.classList.remove('blinking');

        activeModeContainer.style.display = 'flex';
        noMembersModeContainer.style.display = 'none';

        // Start clock if not already running
        if (!clockInterval) {
            clockInterval = setInterval(updateClock, 1000);
            updateClock();
        }

        // Show & refresh weather
        if (weatherEl) {
            weatherEl.style.opacity = '0.9';
            fetchWeather();
        }

        // Render avatars
        const row = document.getElementById('screensaver-members');
        if (row) {
            row.innerHTML = '';
            activeMembers.forEach(m => {
                const cont = document.createElement('div');
                cont.style.display = 'flex';
                cont.style.flexDirection = 'column';
                cont.style.alignItems = 'center';
                cont.style.gap = '12px';

                const icon = document.createElement('div');
                icon.style.width = '120px';
                icon.style.height = '120px';
                icon.style.borderRadius = '50%';
                icon.style.backgroundImage = `url(${m.avatar})`;
                icon.style.backgroundSize = 'cover';
                icon.style.backgroundPosition = 'center';
                icon.style.backgroundColor = 'black';
                icon.style.boxShadow = '0 6px 16px rgba(0,0,0,0.5)';

                const name = document.createElement('div');
                name.style.fontSize = '48px';
                name.style.fontWeight = '600';
                name.style.textShadow = '0 2px 6px rgba(0,0,0,0.7)';
                name.style.maxWidth = '160px';
                name.style.wordBreak = 'break-word';
                name.textContent = m.name || m.member_code || 'Unknown';

                cont.appendChild(icon);
                cont.appendChild(name);
                row.appendChild(cont);
            });
        }
    }
}

// ────────────────────────────────────────────────
// Show / Hide
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

    try { saver.focus({ preventScroll: true }); } catch (e) {}
    startWifiCheckInSaver(); // your wifi logic
}

function hideScreensaver() {
    saver.style.opacity = '0';
    setTimeout(() => {
        saver.style.visibility = 'hidden';
        hideInactivityWarning();
    }, 1000);

    const weatherEl = document.getElementById('weather-status');
    if (weatherEl) weatherEl.style.opacity = '0';
    stopWifiCheckInSaver(); // your wifi logic
}

// ────────────────────────────────────────────────
// Export / attach
// ────────────────────────────────────────────────
window.Screensaver = {
    show: showScreensaver,
    hide: hideScreensaver,
    setMembers: updateScreensaverMembers
};

// Keep your existing: fetchWeather, resetReminderTimer, showInactivityWarning, etc.
// Keep your brightness dim/restore, event listeners, beforeunload cleanups, etc.