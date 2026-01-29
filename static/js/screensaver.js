/* ==============================================================
   screensaver.js
   Full screensaver + clock + pre-dim + brightness control
   FIXED & CLEAN – no syntax errors
   + Repeating 20-minute inactivity reminder for same members
   + Weather status (Yerevan, Armenia) on right side of time
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
   
       // Clock + Weather container
       const clockContainer = document.createElement('div');
       clockContainer.style.display = 'flex';
       clockContainer.style.alignItems = 'center';
       clockContainer.style.justifyContent = 'center';
       clockContainer.style.gap = '80px'; // space between time and weather
       clockContainer.style.width = '100%';
       wrapper.appendChild(clockContainer);
   
       // Time element (left/center)
       const timeEl = document.createElement('div');
       timeEl.id = 'clock-time';
       Object.assign(timeEl.style, {
           fontSize: '100px',
           fontWeight: '600',
           lineHeight: '1',
           textAlign: 'center',
           minWidth: '320px' // prevents layout shift when weather changes
       });
       clockContainer.appendChild(timeEl);
   
       // Weather element (right side)
       const weatherEl = document.createElement('div');
       weatherEl.id = 'weather-status';
       Object.assign(weatherEl.style, {
           fontSize: '28px',
           color: '#a0d8ef',
           textAlign: 'left',
           display: 'flex',
           alignItems: 'center',
           gap: '12px',
           minWidth: '300px',
           opacity: '0.9'
       });
       clockContainer.appendChild(weatherEl);
   
       // Date below
       const dateEl = document.createElement('div');
       dateEl.id = 'clock-date';
       Object.assign(dateEl.style, {
           fontSize: '50px',
           fontWeight: '400',
           textAlign: 'center',
           marginTop: '10px'
       });
       wrapper.appendChild(dateEl);
   
       saver.appendChild(wrapper);
   }
   
   // Clock + Weather update
   function updateClockAndWeather() {
       const now = new Date();
       const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
       const weekday = now.toLocaleDateString('en-IN', { weekday: 'short' });
       const day = now.getDate();
       const month = now.toLocaleDateString('en-IN', { month: 'short' });
       const year = now.getFullYear();
       const date = `${weekday}, ${day} ${month} ${year}`;
   
       document.getElementById('clock-time').textContent = time;
       document.getElementById('clock-date').textContent = date;
   
       // Update weather only every 30 minutes or on first load
       const lastUpdate = localStorage.getItem('lastWeatherUpdate');
       const nowMs = Date.now();
       if (!lastUpdate || nowMs - parseInt(lastUpdate) > 30 * 60 * 1000) {
           fetchWeather();
       }
   }
   
   // Fetch weather for Yerevan, Armenia (Open-Meteo - free, no key)
   async function fetchWeather() {
       try {
           const response = await fetch(
               'https://api.open-meteo.com/v1/forecast?latitude=40.18&longitude=44.51&current=temperature_2m,weather_code&timezone=Asia/Yerevan'
           );
           const data = await response.json();
           const current = data.current;
   
           const temp = Math.round(current.temperature_2m);
           const weatherCode = current.weather_code;
   
           // WMO weather code → emoji + text
           let icon = '🌤️';
           let condition = 'Clear';
   
           if (weatherCode >= 0 && weatherCode <= 3) { icon = '☀️'; condition = 'Sunny'; }
           else if (weatherCode <= 48) { icon = '☁️'; condition = 'Cloudy'; }
           else if (weatherCode <= 67) { icon = '🌧️'; condition = 'Rain'; }
           else if (weatherCode <= 77) { icon = '❄️'; condition = 'Snow'; }
           else if (weatherCode <= 99) { icon = '⛈️'; condition = 'Thunderstorm'; }
   
           document.getElementById('weather-status').innerHTML = `
               <span style="font-size:48px;">${icon}</span>
               <div>
                   <div style="font-size:36px; font-weight:600;">${temp}°C</div>
                   <div style="font-size:18px; opacity:0.9;">Yerevan, ${condition}</div>
               </div>
           `;
   
           localStorage.setItem('lastWeatherUpdate', Date.now());
       } catch (err) {
           console.error('Weather fetch failed:', err);
           document.getElementById('weather-status').innerHTML = 
               '<div style="font-size:24px; opacity:0.7;">Weather unavailable</div>';
       }
   }
   
   setInterval(updateClockAndWeather, 1000);
   updateClockAndWeather(); // initial call
   
   // ────────────────────────────────────────────────
   // Repeating reminder every 20 minutes for same active members
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
               // First reminder after 20 minutes
               setTimeout(showInactivityWarning, 20 * 60 * 1000);
   
               // Repeat every 20 minutes
               reminderInterval = setInterval(showInactivityWarning, 20 * 60 * 1000);
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
   
       console.log(
           `[REMINDER SHOWN] ${timestamp} | ` +
           `Same members active for ≥20 min | ` +
           `Visible for 60 seconds`
       );
   
       let msg = document.getElementById('inactivity-warning');
       if (!msg) {
           msg = document.createElement('div');
           msg.id = 'inactivity-warning';
   
           Object.assign(msg.style, {
               position: 'fixed',
               top: '16px',
               left: '16px',
               right: '16px',
               maxWidth: '580px',
               margin: '0 auto',
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
                       <div style="font-size:25px; font-weight:500; color:#8ab4f8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                           APM Meter
                       </div>
                       <div style="font-size:12px; color:rgba(255,255,255,0.7);">
                           just now
                       </div>
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
           setTimeout(() => {
               msg.style.display = 'none';
           }, 400);
       }, 60 * 1000); // visible for 60 seconds
   }
   
   function hideInactivityWarning() {
       const msg = document.getElementById('inactivity-warning');
       if (msg) {
           msg.style.opacity = '0';
           msg.style.transform = 'translateY(-20px)';
           setTimeout(() => {
               msg.style.display = 'none';
           }, 400);
       }
   }
   
   window.addEventListener('beforeunload', () => {
       if (reminderInterval) clearInterval(reminderInterval);
   });
   // ────────────────────────────────────────────────
   
   // ... rest of your code (showScreensaver, hideScreensaver, preDim, restoreBrightness, etc.) remains unchanged ...
   
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
   
   // Bilingual warning
   const warningMsg = document.createElement('div');
   warningMsg.id = 'screensaver-warning';
   Object.assign(warningMsg.style, {
       fontSize: '40px',
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
       No active members! Please activate at least one.<br>
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
   
       resetReminderTimer(activeMembers);
   
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