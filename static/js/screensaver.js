/* ==============================================================
   screensaver.js
   Full screensaver + clock + pre-dim + brightness control
   WITH LEFT CLOCK / RIGHT MEMBERS LAYOUT
   ============================================================== */

let wrapper;
let membersRow;
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
        outline: 'none'
    });
    saver.tabIndex = -1;
    document.body.appendChild(saver);

    // Main horizontal container (left: clock, right: members)
    const mainContainer = document.createElement('div');
    mainContainer.id = 'screensaver-main';
    Object.assign(mainContainer.style, {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 80px',           // breathing room on sides
        boxSizing: 'border-box'
    });
    saver.appendChild(mainContainer);

    // LEFT: Clock wrapper
    wrapper = document.createElement('div');
    wrapper.id = 'clock-wrapper';
    Object.assign(wrapper.style, {
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',     // left aligned
        maxWidth: '50%'
    });

    const timeEl = document.createElement('div');
    timeEl.id = 'clock-time';
    Object.assign(timeEl.style, {
        fontSize: '160px',            // larger for prominence
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

    // RIGHT: Members container
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

    try {
        saver.focus({ preventScroll: true });
    } catch (e) {}
}

function hideScreensaver() {
    saver.style.opacity = '0';
    setTimeout(() => { saver.style.visibility = 'hidden'; }, 1000);
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

    preDimTimeout = setTimeout(preDimBrightness, 20000);      // 20s → dim
    screensaverTimeout = setTimeout(showScreensaver, 30000);  // 30s → screensaver
}

// Block input when screensaver active
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

// Wake on interaction when on main screen
['mousemove', 'keypress', 'click', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => {
        if (currentState === 'main') resetScreensaverTimer();
    }, { passive: true });
});

// Warning message (centered when no members)
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

// Update members display
function updateScreensaverMembers(members = []) {
    const row = document.getElementById('screensaver-members');
    const warning = document.getElementById('screensaver-warning');
    if (!row || !warning) return;

    row.innerHTML = '';

    const activeMembers = members.filter(m => m.active === true);

    if (activeMembers.length === 0) {
        saver.style.background = 'red';
        saver.classList.add('blinking');
        row.style.display = 'none';
        warning.style.display = 'block';
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