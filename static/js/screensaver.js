/* ==============================================================
   screensaver.js
   Full screensaver + clock + pre-dim + brightness control
   FIXED & CLEAN – no syntax errors
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
   
   function showScreensaver() {
       saver.style.visibility = 'visible';
       saver.style.opacity = '1';
   
       // 🔥 SYNC MEMBERS HERE - fallback if membersData not loaded yet
       if (window.Screensaver && membersData?.members) {
           Screensaver.setMembers(membersData.members);
       } else {
           // If membersData not ready, fetch it (assuming fetchMembers exists)
           if (typeof fetchMembers === 'function') {
               fetchMembers().then(() => {
                   if (membersData?.members) {
                       Screensaver.setMembers(membersData.members);
                   }
               });
           }
       }
   
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
   
   // New: Add CSS for blinking background (inline style sheet)
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
   
       if (activeMembers.length === 0) {
           // No active members: red blinking background + warning
           saver.style.background = 'red';
           saver.classList.add('blinking');
           row.style.display = 'none';
           warning.style.display = 'block';
       } else {
           // Active members: normal black, show icons, no warning/blinking
           saver.style.background = 'black';
           saver.classList.remove('blinking');
           row.style.display = 'flex';
           warning.style.display = 'none';
   
           activeMembers.forEach(m => {
               const icon = document.createElement('div');
               Object.assign(icon.style, {
                   width: '102px',
                   height: '102px',
                   borderRadius: '50%',
                   backgroundImage: `url(${m.avatar})`,
                   backgroundSize: 'cover',
                   backgroundPosition: 'center',
                   backgroundColor: 'black',
               });
               row.appendChild(icon);
           });
       }
   }
   
   window.Screensaver = {
       show: showScreensaver,
       hide: hideScreensaver,
       setMembers: updateScreensaverMembers
   };