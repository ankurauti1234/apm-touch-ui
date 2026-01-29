/* ==============================================================
   screensaver.js
   Full screensaver + clock + pre-dim + brightness control
   FIXED & CLEAN – no syntax errors
   + 45-minute inactivity warning for same members
   + TEMPORARY: 1-minute test notification banner (reminder when members active)
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
   // 45-minute same-members warning feature
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
               display: 'none',
           });
           msg.textContent = 'Change the active members if needed';
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
   
   // Warning message element
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
   
   // ────────────────────────────────────────────────────────────────
   // TEMPORARY – 1 minute repeating test banner (only when members active)
   // Remove or comment out everything below this line after testing
   // ────────────────────────────────────────────────────────────────
   
   let testBannerInterval = null;

   function createTestBanner() {
       let banner = document.getElementById('test-active-reminder');
       if (!banner) {
           banner = document.createElement('div');
           banner.id = 'test-active-reminder';
           Object.assign(banner.style, {
               position: 'fixed',
               top: '32px',
               left: '50%',
               transform: 'translateX(-50%)',
               background: 'rgba(255, 193, 7, 0.95)', // amber yellow – Android warning style
               color: '#111',
               padding: '18px 40px',
               borderRadius: '16px',
               fontSize: '30px',
               fontWeight: '700',
               zIndex: '99999',
               boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
               border: '4px solid #ff9800',
               maxWidth: '92%',
               textAlign: 'center',
               pointerEvents: 'none',
               display: 'none',
               lineHeight: '1.4'
           });
   
           banner.innerHTML = `
               <div style="font-size:42px; margin-bottom:10px;">⚠️ ACTIVE MEMBERS ALERT</div>
               <div>The same people have been active for some time now</div>
               <div style="font-size:24px; margin-top:14px; opacity:0.9;">
                   Checked at ${new Date().toLocaleTimeString('en-IN')}
               </div>
           `;
   
           document.body.appendChild(banner);
       }
       return banner;
   }
   
   function showTestReminder() {
       // Only show if we have active members
       const hasActive = (membersData?.members || []).some(m => m.active === true);
       if (!hasActive) return;
   
       // ── Removed the screensaver check ──
       // Banner will now appear BOTH on main screen and on top of screensaver
   
       const banner = createTestBanner();
       banner.style.display = 'block';
   
       // Auto hide after 30 seconds
       setTimeout(() => {
           banner.style.display = 'none';
       }, 30000);
   }
   
   function startTestReminderLoop() {
       if (testBannerInterval) clearInterval(testBannerInterval);
   
       testBannerInterval = setInterval(showTestReminder, 60000); // every 60 seconds
   }
   
   // Hook into member updates to start the loop
   const originalSetMembers = window.Screensaver.setMembers;
   window.Screensaver.setMembers = function(members) {
       originalSetMembers.call(window.Screensaver, members);
   
       // Start repeating reminder once we have real data
       if (members && Array.isArray(members) && members.length > 0) {
           startTestReminderLoop();
           // Show first one quickly for testing
           setTimeout(showTestReminder, 3000);
       }
   };
   
   // Optional: stop the interval when page is hidden / destroyed (good practice)
   window.addEventListener('beforeunload', () => {
       if (testBannerInterval) clearInterval(testBannerInterval);
   });
   
   // ────────────────────────────────────────────────────────────────
   // End of temporary test code – remove from here upward when done
   // ────────────────────────────────────────────────────────────────