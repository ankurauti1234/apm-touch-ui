/* ==============================================================
   actions.js
   Retry loops for input source and video detection
   ============================================================== */
   async function submitHHID() {
    hhid = document.getElementById('hhid')?.value.trim();
    CURRENT_HHID = hhid;

    if (!hhid) return showError('Enter HHID');

    // --- VALIDATION RULES ---
    if (!hhid) return showError('Enter HHID');
    if (!/^[A-Za-z0-9]+$/.test(hhid)) return showError('Special characters not allowed');
    // if (hhid.length !== 6) return showError('HHID must be exactly 6 characters long');

    // --- Normalizing (optional but cleaner) ---
    hhid = hhid.toUpperCase();

    const btn = event?.target;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-icons">hourglass_top</span> Sending...'; }
    try {
        const r = await fetch('/api/submit_hhid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hhid }) });
        const d = await r.json();
        if (d.success) { showError('OTP sent! Check email.', 'success'); setTimeout(() => navigate('otp_verification'), 1500); }
        else showError(d.error || 'Invalid HHID');
    } catch { showError('Network error'); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons">send</span> Submit & Send OTP'; } }
}


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