/* ==============================================================
   render.js
   Rendering logic + progress bar + error/success messages
   ============================================================== */

function render(details = null) {
    // Safety check
    if (!states[currentState] || typeof states[currentState] !== 'function') {
        console.error("Invalid state:", currentState, "→ forcing welcome");
        currentState = 'welcome';
    }

    const html = states[currentState](details);

    if (currentState === 'main') {
        // Main dashboard – no progress bar, full reset
        resetScreensaverTimer();
        container.innerHTML = html;
        progressBar.style.display = 'none';

        // Fix background images after DOM insert
        setTimeout(() => {
            document.querySelectorAll('.member-card-grid').forEach(c => {
                const bg = c.style.getPropertyValue('--bg-image') || '';
                if (bg) c.style.setProperty('--card-bg', bg);
            });
        }, 10);

    } else {
        // All other states – wrapped in card + progress bar
        container.innerHTML = `
            <div class="container"><div class="card">
                <div id="progress-bar-temp"></div>${html}
            </div></div>`;

        // Move progress bar into place
        const tmp = container.querySelector('#progress-bar-temp');
        if (tmp && progressBar) {
            tmp.parentNode.insertBefore(progressBar, tmp);
            tmp.remove();
        }
        progressBar.style.display = 'flex';
        updateProgressBar();
    }
}

function updateProgressBar() {
    if (!progressBar) return;
    const idx = steps.findIndex(s => s.id === currentState);
    if (idx === -1) return;

    progressBar.innerHTML = steps.map((_, i) => `
        <div class="progress-step ${i <= idx ? 'active' : ''}"></div>
    `).join('');
}

function showError(msg, type = 'error') {
    const el = document.getElementById('error');
    if (!el) return;

    el.innerHTML = `<span class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</span> ${msg}`;
    el.className = type;
    el.style.display = 'flex';

    if (type === 'success') {
        setTimeout(() => el.style.display = 'none', 3000);
    }
}