/* ==============================================================
   screensaver.js
   Full screensaver + clock + pre-dim + brightness control
   FIXED & CLEAN – no syntax errors
   + Repeating 20-minute inactivity reminder for same members
   + Weather status (Yerevan, Armenia) only on screensaver when members active
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
           justifyContent: 'center', alignItems: 'center',
           position: 'relative'  // for absolute positioning of weather
       });
   
       const timeEl = document.createElement('div');
       timeEl.id = 'clock-time';
       Object.assign(timeEl.style, {
           fontSize: '100px',
           fontWeight: '600',
           lineHeight: '1',
           textAlign: 'center',
           marginRight: '300px'

       });
   
       const dateEl = document.createElement('div');
       dateEl.id = 'clock-date';
       Object.assign(dateEl.style, {
           fontSize: '50px',
           fontWeight: '400',
           textAlign: 'center',
           marginTop: '10px',
           marginRight: '300px'
       });
   
       // Weather element – absolute positioned on right, hidden by default
       const weatherEl = document.createElement('div');
       weatherEl.id = 'weather-status';
       Object.assign(weatherEl.style, {
           position: 'absolute',
           right: '-28px',                    // adjust this % or use px (e.g. '60px')
           top: '180px',
           transform: 'translateY(-50%)',
           fontSize: '28px',
           color: '#a0d8ef',
           display: 'flex',
           alignItems: 'center',
           gap: '12px',
           minWidth: '280px',
           opacity: '0',
           transition: 'opacity 0.6s ease',
           pointerEvents: 'none',
           zIndex: '10',
           marginRight: '30px'
       });
       wrapper.appendChild(timeEl);
       wrapper.appendChild(dateEl);
       wrapper.appendChild(weatherEl);
   
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
   
   // Fetch weather – called only when needed
   async function fetchWeather() {
       try {
           const response = await fetch(
               'https://api.open-meteo.com/v1/forecast?latitude=40.18&longitude=44.51&current=temperature_2m,weather_code&timezone=Asia/Yerevan'
           );
           const data = await response.json();
           const current = data.current;
           const temp = Math.round(current.temperature_2m);
           const weatherCode = current.weather_code;
   
           let icon = '🌤️';
           let condition = 'Clear';
           if (weatherCode >= 0 && weatherCode <= 3) { icon = '/static/assets/sunny.png'; condition = 'Sunny'; }
           else if (weatherCode <= 48) { icon = '/static/assets/cloudy.png'; condition = 'Cloudy'; }
           else if (weatherCode <= 67) { icon = '🌧️'; condition = '/static/assets/rainy.png'; }
           else if (weatherCode <= 77) { icon = '❄️'; condition = '/static/assets/snow.png'; }
           else if (weatherCode <= 99) { icon = '⛈️'; condition = '/static/assets/thunderstrom.png'; }
   
           const weatherEl = document.getElementById('weather-status');
           weatherEl.innerHTML = `
                <div>
                    <div style="font-weight:600; display:flex; align-items:center; gap:8px;">
                    <img src="${icon}" alt="${condition}" style="width:68px; height:68px;" />
                    <span style="font-size:53px;">${temp}°C</span>
                    </div>
                    <div style="font-size:24px; opacity:0.9;">
                    Yerevan, ${condition}
                    </div>
                </div>
           `;

           weatherEl.style.opacity = '0.9'; // fade in
       } catch (err) {
           console.error('Weather fetch failed:', err);
           const weatherEl = document.getElementById('weather-status');
           weatherEl.innerHTML = '<div style="font-size:24px; opacity:0.7;">Weather unavailable</div>';
           weatherEl.style.opacity = '0.7';
       }
   }
   
   // ────────────────────────────────────────────────
   // Repeating reminder every 20 minutes
   let lastActiveMemberKeys = '';
   let reminderInterval = null;
   
   function resetReminderTimer(activeMembers = []) {
       const currentKeys = activeMembers
           .map(m => m.member_code || m.id || m.name || '')
           .filter(Boolean)
           .sort()
           .join('|');
   
       if (currentKeys !== lastActiveMemberKeys) {
           lastActiveMemberKeys = currentKeys;
           hideInactivityWarning();
   
           if (reminderInterval) {
               clearInterval(reminderInterval);
               reminderInterval = null;
           }
   
           if (activeMembers.length > 0) {
               setTimeout(showInactivityWarning, 20 * 60 * 1000);
               reminderInterval = setInterval(showInactivityWarning, 20 * 60 * 1000);
               // Fetch weather when members become active
               fetchWeather();
           } else {
               // Hide weather when no active members
               const weatherEl = document.getElementById('weather-status');
               if (weatherEl) weatherEl.style.opacity = '0';
           }
       }
   }
   
   function showInactivityWarning() {
       const now = new Date();
       const timestamp = now.toLocaleString('en-IN', {
           year: 'numeric', month: '2-digit', day: '2-digit',
           hour: '2-digit', minute: '2-digit', second: '2-digit',
           hour12: false
       });
   
       console.log(`[REMINDER SHOWN] ${timestamp} | Same members active for ≥20 min | Visible for 60 seconds`);
   
       let msg = document.getElementById('inactivity-warning');
       if (!msg) {
           msg = document.createElement('div');
           msg.id = 'inactivity-warning';
           Object.assign(msg.style, {
               position: 'fixed',
               top: '16px', left: '16px', right: '16px',
               maxWidth: '580px', margin: '0 auto',
               backgroundColor: 'rgba(32, 33, 36, 0.92)',
               color: '#e0e0e0',
               borderRadius: '24px',
               boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
               overflow: 'hidden',
               zIndex: '9999',
               display: 'none',
               fontFamily: 'Roboto, system-ui, sans-serif',
               padding: '0',
               opacity: '0',
               transform: 'translateY(-20px)',
               transition: 'all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
           });
   
           msg.innerHTML = `
               <div style="display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                   <div style="width:32px; height:32px; background:#ff9800; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:bold; margin-right:16px; flex-shrink:0;">
                       !
                   </div>
                   <div style="flex:1; min-width:0;">
                       <div style="font-size:25px; font-weight:500; color:#8ab4f8;">
                           APM Meter
                       </div>
                       <div style="font-size:12px; color:rgba(255,255,255,0.7);">just now</div>
                   </div>
               </div>
               <div style="padding:16px 20px;">
                   <div style="font-size:28px; font-weight:500; line-height:1.4; margin-bottom:4px;">
                       The same members have been active for a long time change them if needed.
                   </div>
                   <div style="font-size:28px; color:rgba(255,255,255,0.85); line-height:1.4;">
                       Նույն անդամները երկար ժամանակ ակտիվ են եղել, անհրաժեշտության դեպքում փոխեք նրանց
                   </div>
               </div>
           `;
   
           saver.appendChild(msg);
       }
   
       msg.style.display = 'block';
       setTimeout(() => {
           msg.style.opacity = '1';
           msg.style.transform = 'translateY(0)';
       }, 10);
   
       setTimeout(() => {
           msg.style.opacity = '0';
           msg.style.transform = 'translateY(-20px)';
           setTimeout(() => { msg.style.display = 'none'; }, 400);
       }, 60 * 1000);
   }
   
   function hideInactivityWarning() {
       const msg = document.getElementById('inactivity-warning');
       if (msg) {
           msg.style.opacity = '0';
           msg.style.transform = 'translateY(-20px)';
           setTimeout(() => { msg.style.display = 'none'; }, 400);
       }
   }
   
   window.addEventListener('beforeunload', () => {
       if (reminderInterval) clearInterval(reminderInterval);
   });
   
   // ────────────────────────────────────────────────
   function showScreensaver() {
       saver.style.visibility = 'visible';
       saver.style.opacity = '1';
   
       if (window.Screensaver && membersData?.members) {
           Screensaver.setMembers(membersData.members);
       } else if (typeof fetchMembers === 'function') {
           fetchMembers().then(() => {
               if (membersData?.members) Screensaver.setMembers(membersData.members);
           });
       }
   
       try { saver.focus({ preventScroll: true }); } catch (e) {}
   
       // Show weather when screensaver appears (if members active)
       const weatherEl = document.getElementById('weather-status');
       if (weatherEl && membersData?.members?.some(m => m.active)) {
           weatherEl.style.opacity = '0.9';
       }
   }
   
   function hideScreensaver() {
       saver.style.opacity = '0';
       setTimeout(() => { saver.style.visibility = 'hidden'; }, 1000);
   
       // Hide weather when screensaver hides
       const weatherEl = document.getElementById('weather-status');
       if (weatherEl) weatherEl.style.opacity = '0';
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
   
       preDimTimeout = setTimeout(preDimBrightness, 20000);
       screensaverTimeout = setTimeout(showScreensaver, 20000);
   }
   
   function blockEventIfActive(e) {
       if (saver.style.visibility === 'visible' && saver.style.opacity !== '0' && !saver.contains(e.target)) {
           e.preventDefault();
           e.stopPropagation();
           e.stopImmediatePropagation();
       }
   }
   
   ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click',
    'touchstart', 'touchend', 'keydown', 'keyup', 'keypress'].forEach(evt => {
       document.addEventListener(evt, blockEventIfActive, { capture: true, passive: false });
   });
   
   saver.addEventListener('click', () => {
       hideScreensaver();
       resetScreensaverTimer();
   }, { capture: true });
   
   ['mousemove', 'keypress', 'click', 'touchstart'].forEach(evt => {
       document.addEventListener(evt, () => {
           if (currentState === 'main') resetScreensaverTimer();
       }, { passive: true });
   });
   
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
   
   const warningMsg = document.createElement('div');
   warningMsg.id = 'screensaver-warning';
   Object.assign(warningMsg.style, {
       fontSize: '35px',
       fontWeight: 'bold',
       textAlign: 'center',
       color: 'white',
       marginTop: '20px',
       lineHeight: '1.3',
       padding: '0 20px',
       maxWidth: '90%',
       display: 'none'
   });
   warningMsg.innerHTML = `
       No active members! Please activate at least one.<br><br>
       Ակտիվ անդամներ չկան! Խնդրում ենք ակտիվացնել առնվազն մեկին.
   `;
   wrapper.appendChild(warningMsg);
   
   const styleSheet = document.createElement('style');
   styleSheet.textContent = `
       @keyframes blink {
           0% { background-color: red; }
           50% { background-color: darkred; }
           100% { background-color: red; }
       }
       .blinking { animation: blink 1s infinite; }
   `;
   document.head.appendChild(styleSheet);
   
   function updateScreensaverMembers(members = []) {
       const row = document.getElementById('screensaver-members');
       const warning = document.getElementById('screensaver-warning');
       const weatherEl = document.getElementById('weather-status');
       if (!row || !warning) return;
   
       row.innerHTML = '';
   
       const activeMembers = members.filter(m => m.active === true);
       resetReminderTimer(activeMembers);
   
       if (activeMembers.length === 0) {
           saver.style.background = 'red';
           saver.classList.add('blinking');
           row.style.display = 'none';
           warning.style.display = 'block';
           hideInactivityWarning();
           if (weatherEl) weatherEl.style.opacity = '0'; // hide weather
       } else {
           saver.style.background = 'black';
           saver.classList.remove('blinking');
           row.style.display = 'flex';
           warning.style.display = 'none';
           if (weatherEl) weatherEl.style.opacity = '0.9'; // show weather
           // Fetch fresh weather when members are active
           fetchWeather();
   
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