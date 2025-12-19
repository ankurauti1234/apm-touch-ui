/* ==============================================================
   api.js
   Tiny, clean, reusable fetch helpers
   ============================================================== */

// GET request
async function apiGet(url) {
    try {
        const res = await fetch(url);
        return await res.json();
    } catch (err) {
        console.error(`GET ${url} failed:`, err);
        return { success: false, error: 'Network error' };
    }
}

// POST request (JSON body)
async function apiPost(url, data = {}) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (err) {
        console.error(`POST ${url} failed:`, err);
        return { success: false, error: 'Network error' };
    }
}


/* ==============================================================
   Member actions
   ============================================================== */

async function toggleMember(idx) {
    if (!membersData?.members?.[idx]) return;

    try {
        const r = await fetch('/api/toggle_member_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: idx })
        });
        const d = await r.json();
        if (d.success) {
            membersData.members[idx] = d.member;
            render();
        } else {
            showError(d.error || 'Failed to update member');
        }
    } catch (err) {
        showError('Network error');
        console.error('Toggle member failed:', err);
    }
}


// Add this to the bottom of api.js
async function fetchMembers() {
    try {
        const res = await fetch('/api/members');
        const data = await res.json();
        if (data.success) {
            membersData = data.data;
        }
    } catch (err) {
        console.error('Failed to fetch members:', err);
    }
}