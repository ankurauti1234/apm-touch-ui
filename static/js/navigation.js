/* ==============================================================
   navigation.js
   Main navigation logic + all state-specific handling
   ============================================================== */

async function navigate(state, param = null) {
    currentState = state;

    /* ---------- CONNECT SELECT ---------- */
    if (state === 'connect_select') {
        const cur = await fetch('/api/current_wifi');
        const cd = await cur.json();
        render(cd.success ? cd.ssid : null);
        return;
    }

    /* ---------- NETWORK TEST ---------- */
    if (state === 'network_test') {
        connectivityMode = param; // 'wifi' | 'gsm'
        render(); // show spinner
        setTimeout(async () => {
            const api = connectivityMode === 'wifi' ? '/api/check_wifi' :
                connectivityMode === 'gsm' ? '/api/check_gsm' : null;
            if (!api) {
                showError('Invalid connectivity mode');
                return;
            }
            try {
                const r = await fetch(api);
                const d = await r.json();
                render(d.success ? 'success' : 'error');
                if (!d.success) {
                    showError(`${connectivityMode.toUpperCase()} not ready`);
                }
            } catch (err) {
                render('error');
                showError('Network test failed');
            }
        }, 1500);
        return;
    }

    /* ---------- INPUT SOURCE DETECTION ---------- */
    if (state === 'input_source_detection') {
        render();
        setTimeout(startInputSourceRetry, 800);
        return;
    }

    /* ---------- VIDEO OBJECT DETECTION ---------- */
    if (state === 'video_object_detection') {
        render();
        setTimeout(startVideoDetectionRetry, 1200);
        return;
    }

    /* ---------- FINALIZE ---------- */
    if (state === 'finalize') {
        let currentConnectivity = "Unknown";

        try {
            const r = await fetch('/api/current_connectivity');
            const d = await r.json();
            currentConnectivity = d.connectivity || "Offline";
        } catch (e) {
            console.warn("Failed to fetch current connectivity");
            currentConnectivity = "Offline";
        }

        const details = {
            meter_id: meterId,
            hhid,
            connectivity: currentConnectivity,  // ← Now live and accurate!
            input_sources: inputSources,
            video_detection: !!document.getElementById('video-status')?.dataset.detected
        };
        render(details);
        return;
    }

    /* ---------- MAIN DASHBOARD ---------- */
    if (state === 'main') {
        await fetchMembers();
        await loadGuestsFromServer();
        render();
        updateGuestCountFromFile();

        // Start screensaver timer only on main screen
        setTimeout(() => {
            if (currentState === 'main') {
                resetScreensaverTimer();
            }
        }, 100);
        return;
    }

    // Default render for all other states
    render();
}