/* ==============================================================
   actions.js
   Retry loops for input source and video detection
   ============================================================== */

let inputSourceRetryInterval = null;

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
            ul.innerHTML = d.sources.map(s => `<li><span class="material-icons">input</span> ${s}</li>`).join('');
            buttonGroup.innerHTML = '';

            if (d.sources.includes('line_in')) {
                showError('Input Source Detected', 'success');
                setTimeout(() => navigate('finalize'), 1200);
                return;
            }

            buttonGroup.innerHTML = `
                <button class="button" onclick="navigate('video_object_detection')">
                    <span class="material-icons">arrow_forward</span> Next
                </button>
            `;

            if (inputSourceRetryInterval) {
                clearInterval(inputSourceRetryInterval);
                inputSourceRetryInterval = null;
            }
            showError('Input sources detected!', 'success');
        } else {
            throw new Error('No sources');
        }
    } catch {
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

function startInputSourceRetry() {
    console.log('Starting input source detection retry loop');
    if (inputSourceRetryInterval) clearInterval(inputSourceRetryInterval);
    fetchInputSources();
    inputSourceRetryInterval = setInterval(() => {
        if (currentState === 'input_source_detection') {
            fetchInputSources();
        } else {
            clearInterval(inputSourceRetryInterval);
            inputSourceRetryInterval = null;
        }
    }, 3000);
}

let videoDetectionRetryInterval = null;

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
            status.innerHTML = `<div class="success"><span class="material-icons">check_circle</span> Video detection active: ${d.status || 'Running'}</div>`;
            status.dataset.detected = 'true';
            checkMessage.style.display = 'none';
            successMessage.style.display = 'block';

            buttonGroup.querySelector('button')?.remove();
            buttonGroup.insertAdjacentHTML('afterbegin', `
                <button class="button" onclick="navigate('finalize')">
                    <span class="material-icons">arrow_forward</span> Next
                </button>
            `);

            if (videoDetectionRetryInterval) {
                clearInterval(videoDetectionRetryInterval);
                videoDetectionRetryInterval = null;
            }
            showError('Video detection successful!', 'success');
        } else {
            throw new Error('Not ready');
        }
    } catch {
        status.innerHTML = `<div class="info"><span class="material-icons">hourglass_top</span> Waiting for video detection...</div>`;
        status.dataset.detected = 'false';

        buttonGroup.querySelector('button')?.remove();
        buttonGroup.insertAdjacentHTML('afterbegin', `
            <button class="button" onclick="checkVideoDetection()">
                <span class="material-icons">refresh</span> Retry Now
            </button>
        `);
    } finally {
        loading.style.display = 'none';
        results.style.display = 'block';
    }
}

function startVideoDetectionRetry() {
    console.log('Starting video detection retry loop');
    if (videoDetectionRetryInterval) clearInterval(videoDetectionRetryInterval);
    checkVideoDetection();
    videoDetectionRetryInterval = setInterval(() => {
        if (currentState === 'video_object_detection') {
            checkVideoDetection();
        } else {
            clearInterval(videoDetectionRetryInterval);
            videoDetectionRetryInterval = null;
        }
    }, 3000);
}



/* ==============================================================
   Form submissions & system actions
   ============================================================== */

let CURRENT_HHID = null;

async function submitHHID() {
    hhid = document.getElementById('hhid')?.value.trim() || '';
    CURRENT_HHID = hhid;

    if (!hhid) return showError('Enter HHID');

    hhid = hhid.toUpperCase();

    const btn = event?.target;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-icons">hourglass_top</span> Sending...';
    }

    try {
        const r = await fetch('/api/submit_hhid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hhid })
        });
        const d = await r.json();
        if (d.success) {
            showError('OTP sent! Check email.', 'success');
            setTimeout(() => navigate('otp_verification'), 1500);
        } else {
            showError(d.error || 'Invalid HHID');
        }
    } catch {
        showError('Network error');
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

    try {
        const r = await fetch('/api/submit_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hhid, otp })
        });
        const d = await r.json();

        if (d.success) {
            CURRENT_HHID = null;
            navigate('input_source_detection');
        } else {
            showError(d.error || 'Invalid OTP');
            input.value = '';
            input.focus();
        }
    } catch {
        showError('Network error. Try again.');
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

    const btn = document.querySelector('button[onclick="retryOTP()"]') || document.querySelector('.button.secondary');
    if (!btn) return;

    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="material-icons spinner-small">hourglass_top</span> Sending…';

    try {
        const r = await fetch('/api/submit_hhid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hhid: CURRENT_HHID })
        });
        const data = await r.json();
        if (data.success) {
            showError("OTP resent! Check your email.", "success");
        } else {
            showError(data.error || "Failed to resend OTP");
        }
    } catch {
        showError("Network error – please try again");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML || '<span class="material-icons">refresh</span> Resend OTP';
    }
}

async function finalizeInstallation() {
    const btn = event?.target;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-icons">hourglass_top</span> Finalizing...';
    }
    try {
        const r = await fetch('/api/finalize', { method: 'POST' });
        const d = await r.json();
        if (d.success) {
            membersData = d.data;
            navigate('main');
        } else {
            showError(d.error);
        }
    } catch {
        showError('Failed to finalize');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons">check_circle</span> Finalize Installation';
        }
    }
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
