/* ==============================================================
   screensaver.js
   Full screensaver + clock + pre-dim + brightness control
   FIXED & CLEAN – no syntax errors
   + 45-minute same-members inactivity warning
   ============================================================== */

   let wrapper;
   let saver = document.getElementById('screensaver');
   if (!saver) {
       saver = document.createElement('div');
       saver.id = 'screensaver';
       Object.assign(saver.style, {
           position: 'fixed',
           left: '0', top: '0',
           width: '100%', height: '100%',
           display: 'flex',
           flexDirection: 'column',
           alignItems: 'center',
           justifyContent: 'center',
           background: 'black',
           zIndex: '2147483647',
           pointerEvents: 'all',
           touchAction: 'none',
           WebkitUserSelect: 'none',
           userSelect: 'none',
           margin: '0', padding: '0',
           color: 'white',
           gap: '10px',
           opacity: '0',
           transition: 'opacity 1s ease',
           visibility: 'hidden',
           outline: 'none'
       });
       saver.tabIndex = -1;
       document.body.appendChild(saver);
   
       wrapper = document.createElement('div');
       wrapper.id = 'clock-wrapper';
       Object.assign(wrapper.style, {
           width: '100%', height: '100%',
           display: 'flex', flexDirection: 'column',
           justifyContent: 'center', alignItems: 'center'
       });
   
       const timeEl = document.createElement('div');
       timeEl.id = 'clock-time';
       Object.assign(timeEl.style, {
           fontSize: '100px', fontWeight: '600',
           marginBottom: '10px', lineHeight: '1', textAlign: 'center'
       });
   
       const dateEl = document.createElement('div');
       dateEl.id = 'clock-date';
       Object.assign(dateEl.style, {
           fontSize: '50px', fontWeight: '400', textAlign: 'center'
       });
   
       wrapper.appendChild(timeEl);
       wrapper.appendChild(dateEl);
       saver.appendChild(wrapper);
   }
   
   // Clock update
   function updateClock() {
       const now = new Date();
       const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
       const weekday = now.toLocaleDateString('en-IN', { weekday: 'short' });
       const day = now.getDate();
       const month = now.toLocaleDateString('en-IN', { month: 'short' });
       const year = now.getFullYear();
       const date = `${weekday}, ${day} ${month} ${year}`;
   
       document.getElementById('clock-time').textContent = time;
       document.getElementById('clock-date').textContent = date;
   }
   
   setInterval(updateClock, 1000);
   updateClock();
   
   // ────────────────────────────────────────────────
   // 45-minute same-members inactivity warning
   let lastMembersChangeTime = Date.now();
   let lastActiveMemberKeys = '';  // string of sorted member_codes/ids
   
   const INACTIVITY_THRESHOLD_MS   = 1 * 60 * 1000;   // 45 minutes
   const WARNING_SHOW_DURATION_MS  = 60 * 1000;        // show warning for 1 minute
   
   function resetInactivityTimer(activeMembers = []) {
       const currentKeys = activeMembers
           .map(m => m.member_code || m.id || m.name || '')
           .filter(Boolean)
           .sort()
           .join('|');
   
       if (currentKeys !== lastActiveMemberKeys) {
           lastMembersChangeTime = Date.now();
           lastActiveMemberKeys = currentKeys;
           hideInactivityWarning(); // hide immediately on change
       }
   }
   
   function showInactivityWarning() {
    let msg = document.getElementById('inactivity-warning');
    if (!msg) {
        msg = document.createElement('div');
        msg.id = 'inactivity-warning';
        
        // Android-like notification card style
        Object.assign(msg.style, {
            position: 'fixed',               // better than absolute for overlay feel
            top: '16px',                     // typical top margin on phone
            left: '16px',
            right: '16px',
            maxWidth: '480px',               // typical notification width
            margin: '0 auto',                // center horizontally
            backgroundColor: 'rgba(32, 33, 36, 0.92)', // dark semi-transparent (Material dark surface)
            color: '#e0e0e0',                // light text
            borderRadius: '24px',            // modern large radius
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            zIndex: '9999',
            display: 'none',
            fontFamily: 'Roboto, system-ui, sans-serif',
            padding: '0',
            opacity: '0',
            transform: 'translateY(-20px)',
            transition: 'all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)', // smooth Material motion
        });

        // Inner structure — mimics Android notification template
        msg.innerHTML = `
            <div style="display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                <!-- Small app icon (replace src with your actual icon path) -->
                <img src="/icon-48.png" alt="App" style="width:32px; height:32px; border-radius:8px; margin-right:16px; flex-shrink:0;">
                <div style="flex:1; min-width:0;">
                    <div style="font-size:14px; font-weight:500; color:#8ab4f8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        Your App Name
                    </div>
                    <div style="font-size:12px; color:rgba(255,255,255,0.7);">
                        just now
                    </div>
                </div>
            </div>
            <div style="padding:16px 20px;">
                <div style="font-size:16px; font-weight:500; line-height:1.4; margin-bottom:4px;">
                    Change the active members if needed
                </div>
                <div style="font-size:14px; color:rgba(255,255,255,0.85); line-height:1.4;">
                    The same team has been active for a long time.
                </div>
            </div>
        `;

        saver.appendChild(msg);
    }

    // Show with animation
    msg.style.display = 'block';
   }
   
   function hideInactivityWarning() {
       const msg = document.getElementById('inactivity-warning');
       if (msg) msg.style.display = 'none';
   }
   
   function checkAndShowInactivityWarning() {
       if (Date.now() - lastMembersChangeTime >= INACTIVITY_THRESHOLD_MS) {
           showInactivityWarning();
           setTimeout(hideInactivityWarning, WARNING_SHOW_DURATION_MS);
       }
   }
   // ────────────────────────────────────────────────
   
   function showScreensaver() {
       saver.style.visibility = 'visible';
       saver.style.opacity = '1';
   
       // Sync members
       if (window.Screensaver && membersData?.members) {
           Screensaver.setMembers(membersData.members);
       } else {
           if (typeof fetchMembers === 'function') {
               fetchMembers().then(() => {
                   if (membersData?.members) {
                       Screensaver.setMembers(membersData.members);
                   }
               });
           }
       }
   
       checkAndShowInactivityWarning();
   
       try {
           saver.focus({ preventScroll: true });
       } catch (e) {}
   }
   
   function hideScreensaver() {
       saver.style.opacity = '0';
       setTimeout(() => { saver.style.visibility = 'hidden'; }, 1000);
   }
   
   async function preDimBrightness() {
       if (isDimmed) return;
       const current = originalBrightness ?? 153;
       originalBrightness = current;
       const minBrightness = 51;
       if (current <= minBrightness + 5) return;
   
       await updateBrightnessAPI(minBrightness);
       isDimmed = true;
       console.log(`[PRE-DIM] ${current} → ${minBrightness}`);
   }
   
   async function restoreBrightness() {
       if (!isDimmed) return;
       const value = originalBrightness ?? 153;
       isDimmed = false;
       await updateBrightnessAPI(value);
       console.log(`[RESTORE] ${value}`);
   }
   
   async function updateBrightnessAPI(value) {
       const mapped = Math.round(51 + (value / 255) * (255 - 51));
       return fetch("/api/brightness", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ brightness: mapped })
       }).catch(err => console.error("Brightness API error:", err));
   }
   
   function resetScreensaverTimer() {
       clearTimeout(screensaverTimeout);
       clearTimeout(preDimTimeout);
       hideScreensaver();
       restoreBrightness();
   
       preDimTimeout = setTimeout(preDimBrightness, 20000);      // 20s → dim
       screensaverTimeout = setTimeout(showScreensaver, 30000);  // 30s → screensaver
   }
   
   // Block all input when screensaver is active
   function blockEventIfActive(e) {
       if (saver.style.visibility === 'visible' && saver.style.opacity !== '0' && !saver.contains(e.target)) {
           e.preventDefault();
           e.stopPropagation();
           e.stopImmediatePropagation();
       }
   }
   
   ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click',
    'touchstart', 'touchend', 'keydown', 'keyup', 'keypress'].forEach(evt => {
       document.addEventListener(evt, blockEventIfActive, { capture: true, passive: false })
   });
   
   saver.addEventListener('click', () => {
       hideScreensaver();
       resetScreensaverTimer();
   }, { capture: true });
   
   // Wake on any movement/touch when on main screen
   ['mousemove', 'keypress', 'click', 'touchstart'].forEach(evt => {
       document.addEventListener(evt, () => {
           if (currentState === 'main') resetScreensaverTimer();
       }, { passive: true });
   });
   
   // Showing active members on screensaver
   const membersRow = document.createElement('div');
   membersRow.id = 'screensaver-members';
   Object.assign(membersRow.style, {
       display: 'flex',
       gap: '16px',
       marginTop: '30px',
       flexWrap: 'wrap',
       justifyContent: 'center'
   });
   wrapper.appendChild(membersRow);
   
   // Warning message element (no active members)
   const warningMsg = document.createElement('div');
   warningMsg.id = 'screensaver-warning';
   Object.assign(warningMsg.style, {
       fontSize: '40px',
       fontWeight: 'bold',
       textAlign: 'center',
       color: 'white',
       marginTop: '20px',
       display: 'none'
   });
   warningMsg.textContent = 'No active members! Please activate at least one.';
   wrapper.appendChild(warningMsg);
   
   // CSS for blinking background
   const styleSheet = document.createElement('style');
   styleSheet.textContent = `
       @keyframes blink {
           0% { background-color: red; }
           50% { background-color: darkred; }
           100% { background-color: red; }
       }
       .blinking {
           animation: blink 1s infinite;
       }
   `;
   document.head.appendChild(styleSheet);
   
   function updateScreensaverMembers(members = []) {
       const row = document.getElementById('screensaver-members');
       const warning = document.getElementById('screensaver-warning');
       if (!row || !warning) return;
   
       row.innerHTML = '';
   
       const activeMembers = members.filter(m => m.active === true);
   
       // Reset the 45-minute timer when active members change
       resetInactivityTimer(activeMembers);
   
       if (activeMembers.length === 0) {
           saver.style.background = 'red';
           saver.classList.add('blinking');
           row.style.display = 'none';
           warning.style.display = 'block';
           hideInactivityWarning();
       } else {
           saver.style.background = 'black';
           saver.classList.remove('blinking');
           row.style.display = 'flex';
           warning.style.display = 'none';
   
           activeMembers.forEach(m => {
               const container = document.createElement('div');
               Object.assign(container.style, {
                   display: 'flex',
                   flexDirection: 'column',
                   alignItems: 'center',
                   gap: '8px',
               });
   
               const icon = document.createElement('div');
               Object.assign(icon.style, {
                   width: '110px',
                   height: '110px',
                   borderRadius: '50%',
                   backgroundImage: `url(${m.avatar})`,
                   backgroundSize: 'cover',
                   backgroundPosition: 'center',
                   backgroundColor: 'black',
                   boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
               });
   
               const label = document.createElement('div');
               Object.assign(label.style, {
                   fontSize: '44px',
                   fontWeight: '600',
                   color: 'white',
                   textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                   textAlign: 'center',
                   maxWidth: '140px',
                   wordBreak: 'break-word',
               });
               label.textContent = m.member_code || m.name || 'Unknown';
   
               container.appendChild(icon);
               container.appendChild(label);
               row.appendChild(container);
           });
       }
   }
   
   window.Screensaver = {
       show: showScreensaver,
       hide: hideScreensaver,
       setMembers: updateScreensaverMembers
   };

   // Continuous check for the 45-min warning (runs every 30 seconds)
let inactivityWarningInterval = setInterval(() => {
    if (saver.style.visibility === 'visible') {
        checkAndShowInactivityWarning();
    }
}, 30000);  // check every 30 seconds while screensaver is shown

// Optional: stop checking when page is closed
window.addEventListener('beforeunload', () => {
    clearInterval(inactivityWarningInterval);
});