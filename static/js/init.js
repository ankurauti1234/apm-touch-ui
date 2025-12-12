/* ==============================================================
   init.js
   Application entry point – runs once on page load
   ============================================================== */

async function init() {
    try {
        // Run both requests in parallel
        const [installRes, stateRes] = await Promise.all([
            fetch('/api/check_installation'),
            fetch('/api/check_current_state')
        ]);

        const installData = await installRes.json();
        const stateData = await stateRes.json();

        // Store meter ID globally
        meterId = installData.meter_id || 'IM000000';

        if (installData.installed) {
            // Already installed → go straight to main dashboard
            currentState = 'main';
            await fetchMembers();
            await loadGuestsFromServer();
        } else {
            // First-time setup
            let savedState = stateData.current_state || 'welcome';

            // Fallback safety
            if (!states[savedState] || savedState === 'main') {
                savedState = 'welcome';
            }
            currentState = savedState;
        }

        console.log('Starting UI in state:', currentState);
        navigate(currentState);

    } catch (err) {
        console.error('Init failed, falling back to welcome:', err);
        currentState = 'welcome';
        navigate('welcome');
    }
}

// Start the app
init();