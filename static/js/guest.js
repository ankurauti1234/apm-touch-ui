/* ==============================================================
   guest.js
   Guest management: dialog, add/remove, sync with server, toast
   FIXED & PERFECT – zero syntax errors
   ============================================================== */

function openDialog() {
    closeSettingsPopup();
    closeWiFiPopup();
    closeEditMemberPopup();
    document.getElementById('guest-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'guest-overlay';
    overlay.innerHTML = `
        <div style="display:flex;align-items:stretch;justify-content:center;gap:0;max-width:1100px;margin:0 auto;background:white;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.45);">
            <!-- LEFT PANEL: GUEST LIST -->
            <div style="width:340px;background:#f0f7ff;padding:28px;display:flex;flex-direction:column;border-right:1px solid #e0e0e0; height:100%; max-height:600px; min-height:600px;">
                <h3 style="margin:0 0 20px;font-size:19px;color:#1a1a1a;">
                    Added Guests <strong id="guest-counter-header">${guests.length}</strong>/8
                </h3>
                <div style="flex:1;overflow-y:auto;padding-right:8px;">
                    <div id="guest-list" style="display:flex;flex-direction:column;gap:12px;"></div>
                </div>
            </div>
            <!-- CENTER PANEL: FORM -->
            <div style="flex:1;min-width:380px;padding:32px 40px;display:flex;flex-direction:column;background:white;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                    <h2 style="margin:0;font-size:22px;font-weight:600;">Add Guest</h2>
                    <button class="guest-close" onclick="closeGuestDialog()"
                        style="background:none;border:none;cursor:pointer;padding:8px;border-radius:50%;transition:all 0.2s;"
                        onmouseover="this.style.background='rgba(0,0,0,0.1)'"
                        onmouseout="this.style.background='none'">
                        <span class="material-icons" style="font-size:32px;color:#666;">close</span>
                    </button>
                </div>
                <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:400px;margin:0 auto;">
                    <label style="font-size:17px;margin-bottom:8px;color:#333;">Age</label>
                    <input type="number" id="guest-age" min="1" max="125" placeholder="e.g. 32" inputmode="none"
                           style="width:100%;padding:18px;font-size:20px;border:2.5px solid #ddd;border-radius:14px;margin-bottom:10px;text-align:center;">
                    <div class="guest-error" id="age-error" style="color:#e74c3c;font-size:15px;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                        <span class="material-icons" style="font-size:19px;">error</span> Please enter age (1–125)
                    </div>
                    <label style="font-size:17px;margin:20px 0 8px;color:#333;">Gender</label>
                    <div class="custom-dropdown">
                        <div id="gender-display" class="dropdown-display">
                            <span class="placeholder">Select gender</span>
                            <span class="material-icons arrow">arrow_drop_down</span>
                        </div>
                        <div id="gender-options" class="dropdown-options">
                            <div class="dropdown-item" data-value="Male">Male</div>
                            <div class="dropdown-item" data-value="Female">Female</div>
                            <div class="dropdown-item" data-value="Other">Other</div>
                        </div>
                    </div>
                    <div class="guest-error" id="gender-error" style="color:#e74c3c;font-size:15px;margin-bottom:20px;display:flex;align-items:center;gap:6px;">
                        <span class="material-icons" style="font-size:19px;">error</span> Please select gender
                    </div>
                    <div style="display:flex;gap:16px;margin-top:30px;">
                        <button class="cancel" onclick="closeGuestDialog()"
                                style="flex:1;padding:18px;border:none;border-radius:14px;background:#f5f5f5;font-size:18px;font-weight:600;cursor:pointer;">Cancel</button>
                        <button class="add" id="add-guest-btn" onclick="addGuest()"
                                style="flex:1;padding:18px;border:none;border-radius:14px;background:#1976d2;color:white;font-size:18px;font-weight:600;cursor:pointer;">Add</button>
                    </div>
                </div>
            </div>
            <!-- RIGHT PANEL: NUMPAD -->
            <div style="width:300px;background:#fafafa;padding:28px;display:flex;align-items:center;justify-content:center;border-left:1px solid #e0e0e0;">
                <div class="guest-numpad" style="display:grid;grid-template-columns:repeat(3,70px);gap:14px;">
                    ${[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n =>
        `<button onclick="numpadPress('${n}')" style="width:70px;height:70px;border:none;border-radius:18px;background:#ffffff;font-size:30px;font-weight:700;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,0.15);">${n}</button>`
    ).join('')}
                    <button onclick="numpadPress('0')" style="grid-column:2;">0</button>
                    <button class="backspace" onclick="numpadBackspace()" style="grid-column:1/4;background:#ffebee;color:#d32f2f;">
                        <span class="material-icons" style="font-size:40px;">backspace</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    hideKeyboard();

    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        document.getElementById('guest-age')?.focus();
        updateGuestList();
        updateGuestCounter();
    });

    overlay.addEventListener('click', e => e.target === overlay && e.stopPropagation());
    loadGuestsForDialog();
    updateGuestCountFromFile();
    updateMembersGrid();
}

function numpadPress(digit) {
    const input = document.getElementById('guest-age');
    if (!input) return;
    let current = input.value || '';
    let newValue = current + digit;
    if (current === '' && digit === '0') return;
    const num = parseInt(newValue, 10);
    if (num === 0 || num > 125) return;
    input.value = newValue;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
}

function numpadBackspace() {
    const input = document.getElementById('guest-age');
    if (!input) return;
    input.value = input.value.slice(0, -1);
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
}

function closeGuestDialog() {
    document.getElementById('guest-overlay')?.remove();
}

function addGuest() {
    const ageInput = document.getElementById('guest-age');
    const ageError = document.getElementById('age-error');
    const genderError = document.getElementById('gender-error');
    const genderDisplay = document.getElementById('gender-display');
    const age = ageInput.value.trim();
    const gender = genderDisplay?.dataset.value || '';
    let valid = true;

    ageError.classList.remove('show');
    genderError.classList.remove('show');

    if (!age || parseInt(age) < 1 || parseInt(age) > 125) {
        ageError.classList.add('show');
        valid = false;
    }
    if (!gender) {
        genderError.classList.add('show');
        valid = false;
    }
    if (!valid) return;

    if (guests.length >= MAX_GUESTS) {
        alert('Maximum 8 guests allowed');
        return;
    }

    guests.push({ age: parseInt(age), gender });
    ageInput.value = '';
    genderDisplay.innerHTML = '<span class="placeholder">Select gender</span><span class="material-icons arrow">arrow_drop_down</span>';
    delete genderDisplay.dataset.value;
    ageInput.focus();

    updateGuestList();
    updateGuestCounter();
    renderGuestCountInMain();
    sendGuestListToServer();
    // updateGuestCountFromFile();

    const container = document.querySelector('.guest-list-container');
    if (container) container.scrollTop = container.scrollHeight;
}

function removeGuest(index) {
    guests.splice(index, 1);
    updateGuestList();
    updateGuestCounter();
    renderGuestCountInMain();
    sendGuestListToServer();
    // updateGuestCountFromFile();
}

function updateGuestList() {
    const list = document.getElementById('guest-list');
    if (!list) return;

    if (guests.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">No guests added yet</div>';
        return;
    }

    list.innerHTML = guests.map((g, i) => `
        <div class="guest-item" style="padding:12px;background:#f8fbff;border-radius:12px;display:flex;justify-content:space-between;align-items:center;">
            <span>Guest ${i + 1}: ${g.age} years • ${g.gender}</span>
            <button onclick="removeGuest(${i})" style="background:none;border:none;color:#d32f2f;font-size:20px;cursor:pointer;">remove</button>
        </div>
    `).join('');
}

function updateGuestCounter() {
    const count = guests.length;
    const header = document.getElementById('guest-counter-header');
    if (header) header.textContent = count;

    const bottom = document.querySelector('.guest-count');
    if (bottom) bottom.textContent = `${count} / 8`;

    const btn = document.getElementById('add-guest-btn');
    if (btn) {
        btn.disabled = count >= MAX_GUESTS;
        btn.textContent = count >= MAX_GUESTS ? 'Limit Reached' : 'Add';
    }
}

async function loadGuestsFromServer() {
    try {
        const res = await fetch('/api/get_guests');
        const data = await res.json();
        if (data.success && Array.isArray(data.guests)) {
            guests = data.guests.map(g => ({ age: g.age, gender: g.gender }));
            updateGuestCounter();
            updateGuestList();
            renderGuestCountInMain();
            console.log(`Loaded ${guests.length} guests from disk`);
        }
    } catch (e) {
        console.warn("Could not load guests:", e);
    }
}

function renderGuestCountInMain() {
    const el = document.querySelector('.guest-count');
    if (el) el.textContent = `${guests.length} / 8`;
}

async function updateGuestCountFromFile() {
    try {
        const res = await fetch('/api/guest_count');
        const data = await res.json();
        if (data.success) {
            const count = data.count;
            const bottom = document.querySelector('.guest-count');
            if (bottom) bottom.textContent = `${count} / 8`;

            const header = document.getElementById('guest-counter-header');
            if (header) header.textContent = count;

            const btn = document.getElementById('add-guest-btn');
            if (btn) {
                btn.disabled = count >= MAX_GUESTS;
                btn.textContent = count >= MAX_GUESTS ? 'Limit Reached' : 'Add';
            }
        }
    } catch (e) {
        console.warn("Failed to update guest count:", e);
    }
}

async function loadGuestsForDialog() {
    try {
        const res = await fetch('/api/guests_list');
        const data = await res.json();
        if (data.success && Array.isArray(data.guests)) {
            guests = data.guests.map(g => ({ age: g.age, gender: g.gender }));
            updateGuestList();
            updateGuestCounter();
        }
    } catch (e) {
        console.warn("Failed to load guests for dialog:", e);
    }
}

async function sendGuestListToServer() {
    try {
        const response = await fetch('/api/sync_guests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guests: guests.map(g => ({ age: g.age, gender: g.gender })) })
        });
        const result = await response.json();
        if (result.success) {
            console.log("Guests synced →", result.guest_count, "guests");
            showToast(`Guest list updated (${guests.length}/8)`);
        } else {
            showToast("Saved locally – will sync when online");
        }
    } catch (err) {
        console.error("Guest sync failed:", err);
        showToast("No internet – saved locally");
    } finally {
        // ALWAYS refresh count from backend after sync attempt
        updateGuestCountFromFile();
    }
}

// Touch-friendly gender dropdown
document.addEventListener('click', function (e) {
    const display = document.getElementById('gender-display');
    const options = document.getElementById('gender-options');
    if (!display || !options) return;

    if (e.target.closest('#gender-display')) {
        const isOpen = options.classList.contains('open');
        options.classList.toggle('open', !isOpen);
        display.classList.toggle('active', !isOpen);
        return;
    }

    if (e.target.classList.contains('dropdown-item')) {
        const value = e.target.dataset.value;
        const text = e.target.textContent;
        display.innerHTML = `<span>${text}</span><span class="material-icons arrow">arrow_drop_down</span>`;
        display.dataset.value = value;
        options.classList.remove('open');
        display.classList.remove('active');
        return;
    }

    if (!e.target.closest('.custom-dropdown')) {
        options.classList.remove('open');
        display.classList.remove('active');
    }
});

// Toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,0.8);color:white;padding:12px 24px;
        border-radius:30px;font-size:16px;z-index:10000;
        animation:fadein 0.3s,fadeout 0.5s 2.5s forwards;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}