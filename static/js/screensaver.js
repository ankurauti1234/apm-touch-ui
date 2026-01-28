/* ==============================================================
   screensaver.js
   Full screensaver + clock + pre-dim + brightness control
   FIXED & CLEAN – no syntax errors
   + 45-minute inactivity warning for same members
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
   // NEW: 45-minute same-members warning feature
   let lastMembersChangeTime = Date.now();
   let lastActiveMemberKeys = '';  // string of sorted member_codes/ids
   
   const INACTIVITY_THRESHOLD_MS = 45 * 60 * 1000;   // 45 minutes
   const WARNING_SHOW_DURATION_MS = 60 * 1000;       // 1 minute
   
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
           Object.assign(msg.style, {
               position: 'absolute',
               top: '15%',
               left: '50%',
               transform: 'translateX(-50%)',
               fontSize: '48px',
               fontWeight: 'bold',
               color: '#ffdd00',
               background: 'rgba(0,0,0,0.75)',
               padding: '20px 50px',
               borderRadius: '12px',
               boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
               zIndex: '100',
               textAlign: 'center',
               display: 'none'
           });
           msg.textContent = 'Change the active members';
           saver.appendChild(msg);
       }
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
   
       // NEW: Check if we should show the 45-min warning
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
   
   // New: Warning message element
   const warningMsg = document.createElement('div');
   warningMsg.id = 'screensaver-warning';
   Object.assign(warningMsg.style, {
       fontSize: '40px',
       fontWeight: 'bold',
       textAlign: 'center',
       color: 'white',
       marginTop: '20px',
       display: 'none' // Hidden by default
   });
   warningMsg.textContent = 'No active members! Please activate at least one.';
   wrapper.appendChild(warningMsg);
   
   // New: Add CSS for blinking background
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
   
       // NEW: Reset the 45-minute timer when active members change
       resetInactivityTimer(activeMembers);
   
       if (activeMembers.length === 0) {
           saver.style.background = 'red';
           saver.classList.add('blinking');
           row.style.display = 'none';
           warning.style.display = 'block';
           hideInactivityWarning();  // hide inactivity msg if no one active
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