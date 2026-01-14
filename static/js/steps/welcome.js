/* Step: Welcome */
window.Steps = window.Steps || {};

window.Steps.welcome = () => `
    <div class="glass-card">
        <div style="margin-bottom: 24px;">
            <span class="material-icons" style="font-size: 64px; color: var(--primary);">bolt</span>
        </div>
        <h1 class="text-h1">Welcome to Indi Meter</h1>
        <p class="text-body" style="margin-top: 8px;">Your smart energy future starts here.</p>

        <div style="margin-top: 32px; width: 100%;">
            <button class="btn btn-primary" onclick="navigate('connect_select')" style="width: 100%;">
                Start Installation <span class="material-icons">arrow_forward</span>
            </button>
        </div>
    </div>
`;
