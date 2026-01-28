/* ==============================================================
   screensaver.js
   Full screensaver + clock + pre-dim + brightness control
   WITH LEFT CLOCK / RIGHT MEMBERS + 45-MIN INACTIVITY WARNING
   ============================================================== */

let wrapper;
let membersRow;
let saver = document.getElementById('screensaver');

// NEW: Variables for 45-min inactivity warning
let lastMembersChangeTime = Date.now();
let lastActiveMemberCodes = [];  // Store member_codes or IDs to detect change
const INACTIVITY_WARNING_THRESHOLD = 45 * 60 * 1000; // 45 minutes in ms
const WARNING_DISPLAY_DURATION = 60 * 1000;         // 1 minute

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
        outline: 'none'
    });
    saver.tabIndex = -1;
    document.body.appendChild(saver);

    // Main horizontal container
    const mainContainer = document.createElement('div');
    mainContainer.id = 'screensaver-main';
    Object.assign(mainContainer.style, {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 80px',
        boxSizing: 'border-box'
    });
    saver.appendChild(mainContainer);

    // Left: Clock
    wrapper = document.createElement('div');
    wrapper.id = 'clock-wrapper';
    Object.assign(wrapper.style, {
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        maxWidth: '50%'
    });

    const timeEl = document.createElement('div');
    timeEl.id = 'clock-time';
    Object.assign(timeEl.style, {
        fontSize: '160px',
        fontWeight: '700',
        lineHeight: '1',
        marginBottom: '20px',
        textAlign: 'left'
    });

    const dateEl = document.createElement('div');
    dateEl.id = 'clock-date';
    Object.assign(dateEl.style, {
        fontSize: '70px',
        fontWeight: '400',
        textAlign: 'left'
    });

    wrapper.appendChild(timeEl);
    wrapper.appendChild(dateEl);
    mainContainer.appendChild(wrapper);

    // Right: Members
    const membersContainer = document.createElement('div');
    membersContainer.id = 'members-container';
    Object.assign(membersContainer.style, {
        flex: '1',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        maxWidth: '50%'
    });

    membersRow = document.createElement('div');
    membersRow.id = 'screensaver-members';
    Object.assign(membersRow.style, {
        display: 'flex',
        gap: '32px',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        maxWidth: '100%'
    });
    membersContainer.appendChild(membersRow);
    mainContainer.appendChild(membersContainer);
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

function showScreensaver() {
    saver.style.visibility = 'visible';
    saver.style.opacity = '1';

    // Sync members
    if (window.Screensaver && membersData?.members) {
        Screensaver.setMembers(membersData.members);
    } else if (typeof fetchMembers === 'function') {
        fetchMembers().then(() => {
            if (membersData?.members) {
                Screensaver.setMembers(membersData.members);
            }
        });
    }

    // NEW: Check if we should show inactivity warning
    checkInactivityWarning();

    try {
        saver.focus({ preventScroll: true });
    } catch (e) {}
}

function hideScreensaver() {
    saver.style.opacity = '0';
    setTimeout(() => { saver.style.visibility = 'hidden'; }, 1000);
}

// NEW: Inactivity warning logic
function checkInactivityWarning() {
    const now = Date.now();
    const timeSinceChange = now - lastMembersChangeTime;

    if (timeSinceChange >= INACTIVITY_WARNING_THRESHOLD) {
        showInactivityMessage();
        // Schedule hide after 60 seconds
        setTimeout(() => {
            hideInactivityMessage();
        }, WARNING_DISPLAY_DURATION);
    }
}

function showInactivityMessage() {
    const msg = document.getElementById('inactivity-warning');
    if (!msg) {
        const newMsg = document.createElement('div');
        newMsg.id = 'inactivity-warning';
        Object.assign(newMsg.style, {
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#ffcc00',          // yellow/orange for attention
            background: 'rgba(0,0,0,0.7)',
            padding: '20px 40px',
            borderRadius: '12px',
            textAlign: 'center',
            zIndex: '10',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            display: 'none'
        });
        newMsg.textContent = 'Change the active members';
        saver.appendChild(newMsg);
        newMsg.style.display = 'block';
    } else {
        msg.style.display = 'block';
    }
}

function hideInactivityMessage() {
    const msg = document.getElementById('inactivity-warning');
    if (msg) {
        msg.style.display = 'none';
    }
}

// NEW: Reset timer when members change
function resetMembersInactivityTimer(currentMembers = []) {
    const currentCodes = currentMembers
        .filter(m => m.active === true)
        .map(m => m.member_code || m.id || m.name)
        .sort()
        .join(',');

    const previousCodes = lastActiveMemberCodes.join(',');

    if (currentCodes !== previousCodes) {
        lastMembersChangeTime = Date.now();
        lastActiveMemberCodes = currentMembers
            .filter(m => m.active === true)
            .map(m => m.member_code || m.id || m.name)
            .sort();
        hideInactivityMessage();  // hide immediately on change
    }
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
    screensaverTimeout = setTimeout(showScreensaver, 30000);
}

// ... (rest of event listeners remain the same)

// Warning message for no active members
const warningMsg = document.createElement('div');
warningMsg.id = 'screensaver-warning';
Object.assign(warningMsg.style, {
    fontSize: '48px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'none',
    maxWidth: '80%',
    padding: '0 40px'
});
warningMsg.textContent = 'No active members! Please activate at least one.';
saver.appendChild(warningMsg);

// Updated members display with inactivity check
function updateScreensaverMembers(members = []) {
    const row = document.getElementById('screensaver-members');
    const warning = document.getElementById('screensaver-warning');
    if (!row || !warning) return;

    row.innerHTML = '';

    const activeMembers = members.filter(m => m.active === true);

    // NEW: Reset inactivity timer when members change
    resetMembersInactivityTimer(activeMembers);

    if (activeMembers.length === 0) {
        saver.style.background = 'red';
        saver.classList.add('blinking');
        row.style.display = 'none';
        warning.style.display = 'block';
        hideInactivityMessage();  // no point showing inactivity msg if no one active
    } else {
        saver.style.background = 'black';
        saver.classList.remove('blinking');
        row.style.display = 'flex';
        warning.style.display = 'none';

        activeMembers.forEach(m => {
            const container = document.createElement('div');
            Object.assign(container.style, {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
            });

            const icon = document.createElement('div');
            Object.assign(icon.style, {
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                backgroundImage: `url(${m.avatar})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: 'black',
                boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
            });

            const label = document.createElement('div');
            Object.assign(label.style, {
                fontSize: '40px',
                fontWeight: '600',
                color: 'white',
                textShadow: '0 2px 6px rgba(0,0,0,0.7)',
                textAlign: 'center',
                maxWidth: '160px',
            });
            label.textContent = m.member_code || m.name || 'Unknown';

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