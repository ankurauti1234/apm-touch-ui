/* ==============================================================
   actions.js
   Retry loops for input source and video detection
   ============================================================== */


async function checkWiFi() {
    try {
        const r = await fetch('/api/check_wifi');
        const d = await r.json();
        if (d.success) {
            const cur = await fetch('/api/current_wifi');
            const cd = await cur.json();
            if (cd.success) {
                navigate('connect_select', cd.ssid);
            } else {
                showWiFiPopup();
            }
        } else {
            showWiFiPopup();
        }
    } catch {
        showError('Wi-Fi check failed');
        showWiFiPopup();
    }
}



async function fetchInputSources() {
    const loading = document.getElementById('input-loading');
    const results = document.getElementById('input-results');
    const ul = results?.querySelector('ul');
    const buttonGroup = document.querySelector('.button-group');

    if (!loading || !results || !ul || !buttonGroup) return;

    try {
        const r = await fetch('/api/input_sources');
        const d = await r.json();

        if (d.success && d.sources?.length > 0) {
            inputSources = d.sources;

            // Show detected sources
            ul.innerHTML = d.sources.map(s => `
                <li><span class="material-icons">input</span> ${s}</li>
            `).join('');

            // Clear any old button
            buttonGroup.innerHTML = '';

            // Check if line_in is present
            if (d.sources.includes('line_in')) {
                // Built-in camera → SKIP EVERYTHING and go directly to finalize
                showError('Input Source Detected', 'success');

                // Small delay so user sees the message and list
                setTimeout(() => {
                    navigate('finalize');
                }, 1200);

                return; // Exit early – no button needed
            }

            // Normal case: external camera → show "Next" button
            buttonGroup.innerHTML = `
                <button class="button" onclick="navigate('video_object_detection')">
                    <span class="material-icons">arrow_forward</span> Next
                </button>
            `;

            // Stop auto-retry
            if (inputSourceRetryInterval) {
                clearInterval(inputSourceRetryInterval);
                inputSourceRetryInterval = null;
            }

            showError('Input sources detected!', 'success');

        } else {
            throw new Error(d.error || 'No sources detected');
        }

    } catch (e) {
        inputSources = [];
        ul.innerHTML = '<li><span class="material-icons">hourglass_top</span> Waiting for input sources...</li>';
        buttonGroup.innerHTML = `
            <button class="button" onclick="fetchInputSources()">
                <span class="material-icons">refresh</span> Retry Now
            </button>
        `;
        showError('Waiting for input...');
    } finally {
        loading.style.display = 'none';
        results.style.display = 'block';
    }
}
// Start auto-retry when entering input_source_detection
function startInputSourceRetry() {
    console.log('Starting input source detection retry loop');
    // Clear any existing interval
    if (inputSourceRetryInterval) clearInterval(inputSourceRetryInterval);

    // Initial call
    fetchInputSources();

    // Retry every 3 seconds
    inputSourceRetryInterval = setInterval(() => {
        if (currentState === 'input_source_detection') {
            fetchInputSources();
        } else {
            clearInterval(inputSourceRetryInterval);
            inputSourceRetryInterval = null;
        }
    }, 3000);
}

async function checkVideoDetection() {
    const loading = document.getElementById('video-loading');
    const results = document.getElementById('video-results');
    const status = document.getElementById('video-status');
    const checkMessage = document.getElementById('checking-video');
    const successMessage = document.getElementById('video-success');
    const buttonGroup = document.querySelector('.button-group');

    if (!loading || !results || !status || !buttonGroup) return;

    try {
        const r = await fetch('/api/video_detection');
        const d = await r.json();

        if (d.success && d.detected) {
            // SUCCESS: Video detection is working!
            status.innerHTML = `<div class="success"><span class="material-icons">check_circle</span> Video detection active: ${d.status || 'Running'}</div>`;
            status.dataset.detected = 'true';

            checkMessage.style.display = 'none';
            successMessage.style.display = 'block';

            // Remove any existing button and add "Next"
            buttonGroup.querySelector('button[data-action="next"], button[data-action="retry"]')?.remove();
            buttonGroup.insertAdjacentHTML('afterbegin', `
                      <button class="button" data-action="next" onclick="navigate('finalize')">
                          <span class="material-icons">arrow_forward</span> Next
                      </button>
                  `);

            // Stop auto-retry on success
            if (videoDetectionRetryInterval) {
                clearInterval(videoDetectionRetryInterval);
                videoDetectionRetryInterval = null;
            }

            showError('Video detection successful!', 'success');
        } else {
            throw new Error(d.error || 'Video detection not ready');
        }
    } catch (e) {
        // FAILURE: Show waiting state + manual retry button
        status.innerHTML = `<div class="info"><span class="material-icons">hourglass_top</span> Waiting for video detection...</div>`;
        status.dataset.detected = 'false';

        // Replace button with "Retry Now"
        buttonGroup.querySelector('button[data-action="next"], button[data-action="retry"]')?.remove();
        buttonGroup.insertAdjacentHTML('afterbegin', `
                  <button class="button" data-action="retry" onclick="checkVideoDetection()">
                      <span class="material-icons">refresh</span> Retry Now
                  </button>
              `);

        if (e.message && e.message !== 'Failed to fetch') {
            showError(e.message);
        }
    } finally {
        loading.style.display = 'none';
        results.style.display = 'block';
    }
}
// Start auto-retry loop when entering video_object_detection state
function startVideoDetectionRetry() {
    console.log('Starting video detection retry loop');

    // Clear any old interval
    if (videoDetectionRetryInterval) clearInterval(videoDetectionRetryInterval);

    // First check immediately
    checkVideoDetection();

    // Then retry every 3 seconds while in this state
    videoDetectionRetryInterval = setInterval(() => {
        if (currentState === 'video_object_detection') {
            checkVideoDetection();
        } else {
            // Stop retrying if user left this step
            clearInterval(videoDetectionRetryInterval);
            videoDetectionRetryInterval = null;
        }
    }, 3000);
}


/* ==============================================================
   Form submissions & system actions
   ============================================================== */

   async function submitHHID() {
    const input = document.getElementById('hhid');
    const rawHhid = input?.value.trim();

    if (!rawHhid) {
        showError('Please enter HHID');
        input?.focus();
        return;
    }

    // --- VALIDATION RULES ---
    if (!/^[A-Za-z0-9]+$/.test(rawHhid)) {
        showError('Special characters not allowed');
        input?.focus();
        return;
    }

    // Optional length check (uncomment if needed)
    // if (rawHhid.length !== 6) {
    //     showError('HHID must be exactly 6 characters long');
    //     input?.focus();
    //     return;
    // }

    // Normalize
    const hhid = rawHhid.toUpperCase();
    CURRENT_HHID = hhid;

    const btn = event?.target;
    if (btn) {
        // 1. Blur input to prevent keyboard flash on touch devices
        input?.blur();

        // 2. Disable immediately, but delay visual text change
        btn.disabled = true;
        setTimeout(() => {
            if (btn.disabled) {  // Only update if still disabled
                btn.innerHTML = '<span class="material-icons">hourglass_top</span> Sending...';
            }
        }, 100);  // 100ms delay is enough to avoid reflow during click
    }

    // Check internet connection before fetch
    if (!navigator.onLine) {
        showError('Internet required');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons">send</span> Submit & Send OTP';
        }
        input?.focus();
        return;
    }

    try {
        const r = await fetch('/api/submit_hhid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hhid })
        });

        if (!r.ok) {
            throw new Error(`Server error: ${r.status}`);
        }

        const d = await r.json();

        if (d.success) {
            showError('OTP sent! Check your email.', 'success');
            setTimeout(() => navigate('otp_verification'), 1500);
        } else {
            showError(d.error || 'Invalid HHID');
            input?.focus();
        }
    } catch (e) {
        console.error("HHID submission failed:", e);
        showError('Failed to connect. Check your internet and try again.');
        input?.focus();
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons">send</span> Submit & Send OTP';
        }
    }
}


async function submitOTP() {
    const input = document.getElementById('otp');
    const otp = input?.value.trim();

    if (!/^\d{4}$/.test(otp)) {
        showError('Please enter a valid 4-digit OTP');
        input.value = '';
        input.focus();
        return;
    }

    const btn = event?.target;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-icons">hourglass_top</span> Verifying...';
    }

    // ← NEW: Check internet connection before making request
    if (!navigator.onLine) {
        showError('Internet required');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons">verified</span> Verify OTP';
        }
        input.focus();
        return;
    }

    try {
        const r = await fetch('/api/submit_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hhid, otp })
        });

        // Optional: Also handle non-200 responses (e.g., 500 server error)
        if (!r.ok) {
            throw new Error(`Server error: ${r.status}`);
        }

        const d = await r.json();

        if (d.success) {
            CURRENT_HHID = null;
            input.value = '';
            navigate('input_source_detection');
        } else {
            showError(d.error || 'Invalid OTP');
            input.value = '';
            input.focus();
        }
    } catch (e) {
        // This now catches only real network/fetch errors (not offline, already handled above)
        console.error("OTP submission failed:", e);
        showError('Check your internet');
        input.value = '';
        input.focus();
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons">verified</span> Verify OTP';
        }
    }
}

async function retryOTP() {
    if (!CURRENT_HHID) {
        showError("HHID missing. Please go back and enter HHID again.");
        return;
    }

    // Find the Resend button
    const btn = document.querySelector('button[onclick="retryOTP()"]') ||
                document.querySelector('.button.secondary');   // fallback

    if (!btn) return;

    // Store original HTML and disable button
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons spinner-small">hourglass_top</span> Sending…';

    // ← NEW: Check internet connection before attempting fetch
    if (!navigator.onLine) {
        showError('Internet connection required. Please connect and try again.');
        btn.disabled = false;
        btn.innerHTML = originalHTML || '<span class="material-icons">refresh</span> Resend OTP';
        return;
    }

    try {
        const r = await fetch('/api/submit_hhid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hhid: CURRENT_HHID })
        });

        // Optional: Handle non-200 responses
        if (!r.ok) {
            throw new Error(`Server error: ${r.status}`);
        }

        const data = await r.json();

        if (data.success) {
            showError("OTP resent! Check your email.", "success");
        } else {
            showError(data.error || "Failed to resend OTP");
        }
    } catch (e) {
        console.error("Resend OTP failed:", e);
        showError('Failed to connect. Check your internet and try again.');
    } finally {
        // Always restore the button (only runs if not already restored in offline case)
        btn.disabled = false;
        btn.innerHTML = originalHTML || '<span class="material-icons">refresh</span> Resend OTP';
    }
}

async function finalizeInstallation() {
    const btn = event?.target;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-icons">hourglass_top</span> Finalizing...'; }
    try {
        const r = await fetch('/api/finalize', { method: 'POST' });
        const d = await r.json();
        if (d.success) { membersData = d.data; navigate('main'); }
        else showError(d.error);
    } catch { showError('Failed to finalize'); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons">check_circle</span> Finalize Installation'; } }
}

async function shutdown() {
    if (!confirm('Shutdown system?')) return;
    try {
        const r = await fetch('/api/shutdown', { method: 'POST' });
        const d = await r.json();
        alert(d.success ? 'Shutting down...' : d.error);
    } catch {
        alert('Shutdown failed');
    }
}

async function restart() {
    if (!confirm('Restart system?')) return;
    try {
        const r = await fetch('/api/restart', { method: 'POST' });
        const d = await r.json();
        alert(d.success ? 'Restarting...' : d.error);
    } catch {
        alert('Restart failed');
    }
}
