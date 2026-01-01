/* ==============================================================
   keyboard.js
   Virtual keyboard + HHID enforcement + input handling
   ============================================================== */

function showKeyboard(el) {
    activeInput = el;

    // Lift Wi-Fi popup only when password field is focused
    if (el.id === 'password' && document.getElementById('wifi-popup')) {
        liftWiFiPopup();
    }

    // Lift main card and bottom bar
    const containerCard = document.querySelector('.container');
    const bottomBar = document.querySelector('.bottom-bar-allpage');
    if (containerCard) containerCard.classList.add('lifted');
    if (bottomBar) bottomBar.classList.add('.lifted');

    // Move icons to corners
    const leftIcons = document.querySelectorAll('.icon-left');
    const rightIcons = document.querySelectorAll('.icon-right');

    leftIcons.forEach(icon => icon.classList.add('lifted'));
    rightIcons.forEach(icon => icon.classList.add('lifted'));


    // Do NOT show keyboard when guest dialog is open (uses its own numpad)
    if (document.getElementById('guest-overlay')) {
        return;
    }

    let kb = document.getElementById('virtual-keyboard');
    if (kb) {
        kb.classList.add('showing');
        renderKeys();
        scrollInputIntoView();
        return;
    }

    kb = document.createElement('div');
    kb.id = 'virtual-keyboard';
    kb.className = 'virtual-keyboard showing';
    kb.innerHTML = `
        <div class="keyboard-body">
            <div class="keyboard-keys" id="keyboard-keys"></div>
            <div class="keyboard-bottom-row">
                <button class="key-special key-shift" onclick="toggleShift()"
                    onmousedown="handleKeyDown(event)" onmouseup="handleKeyUp(event)"
                    ontouchstart="handleKeyDown(event)" ontouchend="handleKeyUp(event)">
                    <span class="material-icons">arrow_upward</span>
                    <span class="key-label">Shift</span>
                </button>

                <button class="key key-space" onclick="insertChar(' ')"
                    onmousedown="handleKeyDown(event)" onmouseup="handleKeyUp(event)"
                    ontouchstart="handleKeyDown(event)" ontouchend="handleKeyUp(event)">Space</button>

                <button class="key-special key-backspace" onclick="backspace()"
                    onmousedown="handleKeyDown(event)" onmouseup="handleKeyUp(event)"
                    ontouchstart="handleKeyDown(event)" ontouchend="handleKeyUp(event)">
                    <span class="key-backspace material-icons">backspace</span>
                </button>

                <button class="key-special key-enter" onclick="pressEnter()"
                    onmousedown="handleKeyDown(event)" onmouseup="handleKeyUp(event)"
                    ontouchstart="handleKeyDown(event)" ontouchend="handleKeyUp(event)">
                    <span class="material-icons">keyboard_return</span>
                    <span class="key-label">Enter</span>
                </button>

                <button class="key-special key-special-characters" onclick="switchSpecialCharacters()"
                    onmousedown="handleKeyDown(event)" onmouseup="handleKeyUp(event)"
                    ontouchstart="handleKeyDown(event)" ontouchend="handleKeyUp(event)">
                    <span id="special-label" class="key-label">!?%</span>
                </button>
            </div>
        </div>`;

    document.body.appendChild(kb);
    renderKeys();
    scrollInputIntoView();

    kb.addEventListener('click', e => e.stopPropagation());
}

function renderKeys() {
    const container = document.getElementById('keyboard-keys');
    if (!container) return;

    const layout = specialActive ? keyboardLayouts.special : (shiftActive ? keyboardLayouts.shift : keyboardLayouts.normal);

    container.innerHTML = layout.map((row, i) => `
        <div class="keyboard-row keyboard-row-${i}">
            ${row.map(k => `
                <button class="key"
                    onclick="insertChar('${k}')"
                    onmousedown="handleKeyDown(event)"
                    onmouseup="handleKeyUp(event)"
                    ontouchstart="handleKeyDown(event)"
                    ontouchend="handleKeyUp(event)">
                    ${k}
                </button>
            `).join('')}
        </div>
    `).join('');
}

function toggleShift() {
    shiftActive = !shiftActive;
    const btn = document.querySelector('.key-shift');
    if (btn) btn.classList.toggle('active', shiftActive);
    renderKeys();
}

// Toggle to special characters layout
function switchSpecialCharacters() {
    specialActive = !specialActive;

    const btn = document.querySelector('.key-special-characters');
    if (btn) btn.classList.toggle('active', specialActive);

    const btn2 = document.querySelector('.key-shift');
    if (btn2) {
        btn2.disabled = specialActive;
        btn2.classList.toggle('key-disabled', specialActive);
    }

    const label = document.getElementById('special-label');
    if (label) label.textContent = specialActive ? 'ABC' : '!?%';

    renderKeys();
}


// HHID input – only numbers, max 4 digits after "HH"
function onlyNumbers(input) {
    let digits = input.value.replace(/[^0-9]/g, '');
    if (digits.length > 4) digits = digits.substring(0, 4);
    input.value = digits;
}

function insertChar(ch) {
    if (!activeInput) return;

    if (activeInput.id === 'hhid') {
        if (!/^[A-Za-z0-9]$/.test(ch)) return;
        if (activeInput.value.length >= 6) return;
        ch = ch.toUpperCase();
    }

    const start = activeInput.selectionStart ?? 0;
    const end = activeInput.selectionEnd ?? 0;
    const text = activeInput.value;

    activeInput.value = text.slice(0, start) + ch + text.slice(end);
    const newPos = start + ch.length;
    activeInput.setSelectionRange(newPos, newPos);
    activeInput.focus();
    scrollInputIntoView();

    if (shiftActive && /[A-Z]/.test(ch)) {
        setTimeout(() => {
            shiftActive = false;
            const btn = document.querySelector('.key-shift');
            if (btn) btn.classList.remove('active');
            renderKeys();
        }, 100);
    }

    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function backspace() {
    if (!activeInput) return;

    const start = activeInput.selectionStart ?? 0;
    const end = activeInput.selectionEnd ?? 0;
    const text = activeInput.value;

    if (start !== end) {
        activeInput.value = text.slice(0, start) + text.slice(end);
        activeInput.setSelectionRange(start, start);
    } else if (start > 0) {
        activeInput.value = text.slice(0, start - 1) + text.slice(start);
        activeInput.setSelectionRange(start - 1, start - 1);
    } else {
        return;
    }

    activeInput.focus();
    scrollInputIntoView();
}

function pressEnter() {
    if (!activeInput) return;
    hideKeyboard();
    if (activeInput.id === 'hhid') submitHHID();
    else if (activeInput.id === 'otp') submitOTP();
}

function hideKeyboard() {
    const kb = document.getElementById('virtual-keyboard');
    if (kb) {
        kb.classList.remove('showing');
        kb.classList.add('hiding');
        setTimeout(() => kb.remove(), 300);
    }
    const containerCard = document.querySelector('.container');
    const bottomBar = document.querySelector('.bottom-bar-allpage');
    if (containerCard) containerCard.classList.remove('lifted');
    if (bottomBar) bottomBar.classList.remove('lifted');

    // Reset icon positions
    const leftIcons = document.querySelectorAll('.icon-left');
    const rightIcons = document.querySelectorAll('.icon-right');

    leftIcons.forEach(icon => icon.classList.remove('lifted'));
    rightIcons.forEach(icon => icon.classList.remove('lifted'));


    document.querySelector('.container')?.classList.remove('lifted');
    document.querySelector('.bottom-bar-allpage')?.classList.remove('lifted');

    activeInput = null;
    shiftActive = false;
    lowerEditMemberPopup();
    lowerWiFiPopup();
}

function scrollInputIntoView() {
    if (!activeInput) return;
    requestAnimationFrame(() => {
        const rect = activeInput.getBoundingClientRect();
        const kb = document.getElementById('virtual-keyboard');
        if (!kb) return;
        const kbTop = kb.getBoundingClientRect().top;
        const bottom = rect.bottom;
        if (bottom > kbTop - 100) {
            window.scrollBy(0, bottom - (kbTop - 120));
        }
        activeInput.focus();
    });
}

// Global click → hide keyboard unless clicking an input
document.addEventListener('click', e => {
    const kb = document.getElementById('virtual-keyboard');
    const wifiPopup = document.getElementById('wifi-popup');
    const wifiOverlay = document.getElementById('wifi-overlay');

    if (kb && kb.contains(e.target)) return;
    if (wifiPopup && wifiPopup.contains(e.target)) return;
    if (wifiOverlay && wifiOverlay.contains(e.target)) return;

    const input = e.target.closest('input');
    if (input) {
        showKeyboard(input);
        return;
    }

    hideKeyboard();
});

// Key press visual feedback
function handleKeyDown(event) {
    const btn = event.currentTarget;
    btn.classList.add('pressed');
}
function handleKeyUp(event) {
    const btn = event.currentTarget;
    btn.classList.remove('pressed');
}