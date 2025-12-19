/* ==============================================================
   edit-member.js
   Edit Member Code popup + lift handling
   ============================================================== */


function showEditMemberPopup() {
    if (document.getElementById('edit-member-popup')) return;

    const overlay = document.createElement('div');
    overlay.id = 'edit-member-overlay';
    overlay.className = 'overlay';

    const popup = document.createElement('div');
    popup.id = 'edit-member-popup';
    popup.className = 'popup';

    popup.innerHTML = `
        <h2 style="margin-top:0;"><span class="material-icons">edit</span> Edit Member Code</h2>
        <p>Choose a member to edit</p>
        <div id="edit-error" class="error" style="display:none;"></div>

        <div class="custom-select" style="margin:1rem 0;">
            <div id="edit-selected" class="selected-item">
                <span id="fetching-members">Select Member</span>
                <span class="material-icons arrow">arrow_drop_down</span>
            </div>
            <ul id="edit-member-list" class="dropdown-list" style="display:none;"></ul>
        </div>

        <div class="password-wrapper" id="code-wrapper" style="position:relative;width:100%;max-width:400px;margin:0 auto;">
            <div style="position:relative;display:flex;align-items:center;">
                <input
                    type="text"
                    id="new-code"
                    placeholder="New Code (e.g. M1A)"
                    maxlength="15"
                    autocomplete="off"
                    style="width:100%;padding:12px 48px 12px 12px;border:1px solid #ccc;border-radius:8px;font-size:16px;outline:none;"
                >
            </div>

            <div class="button-group" style="margin-top:20px;display:flex;gap:10px;justify-content:center;">
                <button class="button" onclick="saveMemberCode()">Save</button>
                <button class="button secondary" onclick="closeEditMemberPopup()">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    // Keyboard + lift handling for the code input
    const codeInput = document.getElementById('new-code');
    if (codeInput) {
        codeInput.addEventListener('focus', () => {
            showKeyboard(codeInput);
            liftEditMemberPopup();
        });
    }

    // Lower popup when buttons are clicked
    popup.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            popup.classList.remove('lifted');
        });
    });

    // Populate member list
    const list = document.getElementById('edit-member-list');
    const selected = document.getElementById('edit-selected');
    const msg = document.getElementById('fetching-members');
    msg.textContent = 'Loading members...';

    if (membersData?.members?.length > 0) {
        membersData.members.forEach((m, i) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${m.member_code || '??'}</span>`;
            li.onclick = (e) => {
                e.stopPropagation();
                selectedMemberIndex = i;
                selected.innerHTML = `<span>${m.member_code || '??'}</span><span class="material-icons arrow">arrow_drop_down</span>`;
                list.style.display = 'none';
                selected.classList.remove('open');
                codeInput.focus();  // ← FIXED
            };
            list.appendChild(li);
        });
    } else {
        list.innerHTML = '<li style="padding:12px;text-align:center;color:#888;">No members</li>';
    }

    // Auto-open dropdown if members exist
    setTimeout(() => {
        if (list.children.length > 0) {
            list.style.display = 'block';
            selected.classList.add('open');
        }
        msg.textContent = 'Select Member';
    }, 20);

    // Dropdown toggle
    selected.onclick = (e) => {
        e.stopPropagation();
        const open = list.style.display === 'block';
        list.style.display = open ? 'none' : 'block';
        selected.classList.toggle('open', !open);
    };

    overlay.onclick = (e) => e.stopPropagation();
}

function liftEditMemberPopup() {
    const p = document.getElementById('edit-member-popup');
    if (p) p.classList.add('lifted');
}

function lowerEditMemberPopup() {
    const p = document.getElementById('edit-member-popup');
    if (p) p.classList.remove('lifted');
}

function closeEditMemberPopup() {
    lowerEditMemberPopup();
    document.getElementById('edit-member-overlay')?.remove();
    document.getElementById('edit-member-popup')?.remove();
    selectedMemberIndex = -1;
}

async function saveMemberCode() {
    const input = document.getElementById('new-code');
    const code = input?.value.trim().toUpperCase();
    const err = document.getElementById('edit-error');

    if (selectedMemberIndex < 0) {
        err.textContent = 'Please select a member';
        err.style.display = 'flex';
        return;
    }
    if (!code || !/^[A-Z0-9]{1,15}$/.test(code)) {
        err.textContent = 'Invalid code (1–15 letters/numbers only)';
        err.style.display = 'flex';
        return;
    }

    try {
        const r = await fetch('/api/edit_member_code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: selectedMemberIndex, member_code: code })
        });
        const d = await r.json();
        if (d.success) {
            membersData.members[selectedMemberIndex] = d.member;
            render(); // refresh dashboard
            closeEditMemberPopup();
        } else {
            err.textContent = d.error || 'Save failed';
            err.style.display = 'flex';
        }
    } catch {
        err.textContent = 'Network error';
        err.style.display = 'flex';
    }
}