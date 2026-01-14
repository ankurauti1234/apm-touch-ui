/* ==============================================================
   screensaver.js
   Full screensaver + clock + pre-dim + brightness control
   FIXED & CLEAN – no syntax errors
   ============================================================== */

let saver = document.getElementById('screensaver');
if (!saver) {
    saver = document.createElement('div');
    saver.id = 'screensaver';
    saver.className = 'screensaver-overlay'; // Use class for styles
    
    // Inline styles reset for fixed positioning
    Object.assign(saver.style, {
        position: 'fixed',
        left: '0', top: '0',
        width: '100%', height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        zIndex: '2147483647',
        visibility: 'hidden',
        opacity: '0',
        transition: 'opacity 0.5s',
    });
    
    document.body.appendChild(saver);

    saver.innerHTML = `
        <div style="border:1px solid #333; padding:40px; text-align:center; background:#050505;">
            <div id="clock-time" style="font-family:'Courier New', monospace; font-size:120px; font-weight:700; color:#fff; letter-spacing:-4px; line-height:1;">00:00</div>
            <div style="width:100%; height:1px; background:#333; margin:20px 0;"></div>
            <div id="clock-date" style="font-family:'Courier New', monospace; font-size:24px; color:#888; text-transform:uppercase; letter-spacing:2px;">MON, 01 JAN 2024</div>
        </div>
        <div style="margin-top:20px; color:#444; font-size:12px; font-family:'Courier New', monospace;">TOUCH TO UNLOCK</div>
    `;
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
    try { saver.focus({ preventScroll: true }); } catch (e) { }
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

// Block all input when screensaver is active
function blockEventIfActive(e) {
    if (saver.style.visibility === 'visible' && saver.style.opacity !== '0' && !saver.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }
}

['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click',
    'touchstart', 'touchend', 'keydown', 'keyup', 'keypress'].forEach(evt => {
        document.addEventListener(evt, blockEventIfActive, { capture: true, passive: false })
    });

saver.addEventListener('click', () => {
    hideScreensaver();
    resetScreensaverTimer();
}, { capture: true });

// Wake on any movement/touch when on main screen
['mousemove', 'keypress', 'click', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => {
        if (currentState === 'main') resetScreensaverTimer();
    }, { passive: true });
});