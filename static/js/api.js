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


//Wifi API 
async function checkWiFi() {
    try {
        const r = await fetch('/api/check_wifi');
        const d = await r.json();
        if (d.success) {
            const cur = await fetch('/api/current_wifi');
            const cd = await cur.json();
            if (cd.success) navigate('connect_select', cd.ssid);
            else showWiFiPopup();
        } else showWiFiPopup();
    } catch { showError('Wi-Fi check failed'); showWiFiPopup(); }
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
