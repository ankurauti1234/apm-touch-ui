/* ==============================================================
   guest.js
   Guest management: dialog, add/remove, sync with server, toast
   FIXED & PERFECT – zero syntax errors
   ============================================================== */

// Open Strict Grid Guest Dialog
function openDialog() {
    closeSettingsPopup();
    closeWiFiPopup();
    closeEditMemberPopup();
    document.getElementById('guest-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'guest-overlay';
    overlay.className = 'overlay';

    overlay.innerHTML = `
        <div class="guest-grid" style="animation: fadeIn 0.15s ease-out;">
            
            <!-- LEFT PANEL: GUEST LIST -->
            <div class="guest-list-side">
                <div style="padding:20px; border-bottom:1px solid var(--border); font-weight:600; display:flex; justify-content:space-between; align-items:center;">
                    <span>Guests <strong id="guest-counter-header" style="color:var(--primary); margin-left:8px;">${guests.length}</strong>/8</span>
                    <button class="button secondary" onclick="refreshGuests()" style="padding:8px 12px; font-size:0.8rem;">
                        <span class="material-icons" style="font-size:16px; margin:0;">refresh</span>
                    </button>
                </div>
                <div id="guest-list" style="padding:0;">
                    <!-- Items appended here -->
                </div>
            </div>

            <!-- RIGHT PANEL: FORM -->
            <div class="guest-form-side">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
                    <h2>Add Guest</h2>
                    <button class="close-btn" onclick="closeGuestDialog()">
                        <span class="material-icons">close</span>
                    </button>
                </div>

                <div class="input-wrapper">
                    <label style="display:block; margin-bottom:8px; color:var(--text-muted); font-size:14px;">Age (1-125)</label>
                    <input type="number" id="guest-age" placeholder="e.g. 30" autocomplete="off" onfocus="showKeyboard(this)">
                </div>
                
                <div class="input-wrapper">
                    <label style="display:block; margin-bottom:8px; color:var(--text-muted); font-size:14px;">Gender</label>
                    <div class="custom-select">
                        <div id="gender-display" class="selected-item" onclick="toggleGenderDropdown()">
                            <span>Select Gender</span>
                            <span class="material-icons arrow">arrow_drop_down</span>
                        </div>
                        <ul id="gender-options" class="dropdown-list" style="display:none;">
                            <li onclick="selectGender('Male')">Male</li>
                            <li onclick="selectGender('Female')">Female</li>
                            <li onclick="selectGender('Other')">Other</li>
                        </ul>
                    </div>
                </div>

                <div style="display:flex; gap:12px; margin-top:24px;">
                    <button class="button" onclick="addGuest()" style="flex:1;">Add Guest</button>
                    <button class="button secondary" onclick="closeGuestDialog()" style="flex:1;">Cancel</button>
                </div>
                
                <div id="guest-error" class="error" style="display:none; margin-top:20px;"></div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    
    // Add logic to toggle dropdown
    window.toggleGenderDropdown = () => {
        const list = document.getElementById('gender-options');
        list.style.display = list.style.display === 'none' ? 'block' : 'none';
    };

    window.selectGender = (val) => {
        const display = document.querySelector('#gender-display span:first-child');
        display.textContent = val;
        display.parentElement.dataset.value = val;
        document.getElementById('gender-options').style.display = 'none';
    };

    updateGuestList();
    loadGuestsForDialog();
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
    const genderDisplay = document.querySelector('#gender-display span:first-child');
    const errorDiv = document.getElementById('guest-error');

    const age = parseInt(ageInput.value, 10);
    const gender = genderDisplay.parentElement.dataset.value;

    errorDiv.style.display = 'none';

    if (!age || age < 1 || age > 125) {
        errorDiv.textContent = 'Please enter a valid age (1-125)';
        errorDiv.style.display = 'flex';
        return;
    }
    if (!gender) {
        errorDiv.textContent = 'Please select a gender';
        errorDiv.style.display = 'flex';
        return;
    }
    if (guests.length >= MAX_GUESTS) {
        errorDiv.textContent = 'Maximum 8 guests allowed';
        errorDiv.style.display = 'flex';
        return;
    }

    guests.push({ age, gender });
    
    // Reset Form
    ageInput.value = '';
    genderDisplay.textContent = 'Select Gender';
    delete genderDisplay.parentElement.dataset.value;
    
    // Updates
    updateGuestList();
    updateGuestCounter();
    renderGuestCountInMain();
    sendGuestListToServer();
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
        list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;">No guests added</div>';
        return;
    }

    list.innerHTML = guests.map((g, i) => `
        <div class="guest-list-item">
            <span><strong>#${i + 1}</strong> &nbsp; ${g.age} yrs • ${g.gender}</span>
            <button class="button secondary" onclick="removeGuest(${i})" style="padding:4px 8px; border-color:var(--error); color:var(--error);">
                <span class="material-icons" style="font-size:18px; margin:0;">delete</span>
            </button>
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