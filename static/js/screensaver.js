// screensaver.js — Clean version: only clock + date, only when active members exist

let saver = document.getElementById('screensaver');

if (!saver) {
    saver = document.createElement('div');
    saver.id = 'screensaver';

    Object.assign(saver.style, {
        position: 'fixed',
        inset: '0',
        background: 'black',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '2147483647',
        opacity: '0',
        transition: 'opacity 1.2s ease',
        visibility: 'hidden',
        userSelect: 'none',
        touchAction: 'none',
        pointerEvents: 'auto',
        outline: 'none',
    });

    saver.tabIndex = -1;
    document.body.appendChild(saver);

    const timeEl = document.createElement('div');
    timeEl.id = 'clock-time';
    Object.assign(timeEl.style, {
        fontSize: 'clamp(110px, 22vw, 200px)',
        fontWeight: '700',
        lineHeight: '1',
        letterSpacing: '-4px',
    });

    const dateEl = document.createElement('div');
    dateEl.id = 'clock-date';
    Object.assign(dateEl.style, {
        fontSize: 'clamp(42px, 10vw, 85px)',
        fontWeight: '400',
        marginTop: '24px',
        opacity: '0.88',
    });

    saver.appendChild(timeEl);
    saver.appendChild(dateEl);
}

// Clock update — always running
function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const date = now.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    document.getElementById('clock-time').textContent = time;
    document.getElementById('clock-date').textContent = date;
}

setInterval(updateClock, 1000);
updateClock();

// ────────────────────────────────────────────────
// Only show screensaver when there is at least one active member
function updateScreensaverMembers(members = []) {
    const hasActive = members.some(m => m.active === true);

    if (hasActive) {
        saver.style.visibility = 'visible';
        setTimeout(() => {
            saver.style.opacity = '1';
        }, 50);
        try { saver.focus({ preventScroll: true }); } catch (e) {}
    } else {
        saver.style.opacity = '0';
        setTimeout(() => {
            saver.style.visibility = 'hidden';
        }, 1300);
    }
}

// ────────────────────────────────────────────────
function showScreensaver() {
    saver.style.visibility = 'visible';
    saver.style.opacity = '1';
    try { saver.focus({ preventScroll: true }); } catch (e) {}
}

function hideScreensaver() {
    saver.style.opacity = '0';
    setTimeout(() => {
        saver.style.visibility = 'hidden';
    }, 1300);
}

// Exit on tap/click anywhere on screensaver
saver.addEventListener('click', () => {
    hideScreensaver();
}, { capture: true });

// ────────────────────────────────────────────────
window.Screensaver = {
    show: showScreensaver,
    hide: hideScreensaver,
    setMembers: updateScreensaverMembers
};

// ────────────────────────────────────────────────
// Optional: inactivity timer — only activates when members are present
let screensaverTimeout = null;

function resetScreensaverTimer() {
    clearTimeout(screensaverTimeout);

    // Only set timer if someone is active
    if (membersData?.members?.some?.(m => m.active === true)) {
        screensaverTimeout = setTimeout(showScreensaver, 45000); // 45 seconds — change as needed
    }
}

['mousemove', 'touchstart', 'keydown', 'click'].forEach(evt => {
    document.addEventListener(evt, resetScreensaverTimer, { passive: true });
});

resetScreensaverTimer();