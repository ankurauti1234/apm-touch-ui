/*=====================================================================
  GLOBAL VARIABLES
=====================================================================*/
const container      = document.getElementById('main-content');
const progressBar    = document.getElementById('progress-bar');
let currentState     = 'loading';
let meterId          = '';
let Cafe            = '';
let connectivityMode = '';
let inputSources     = [];
let membersData      = null;
let activeInput      = null;
let shiftActive      = false;

/*=====================================================================
  STEPS
=====================================================================*/
const steps = [
    { id: 'welcome',               label: 'Start' },
    { id: 'connect_select',        label: 'Connect' },
    { id: 'network_test',          label: 'Network' },
    { id: 'display_meter',         label: 'Meter ID' },
    { id: 'hhid_input',            label: 'HHID' },
    { id: 'otp_verification',      label: 'OTP' },
    { id: 'input_source_detection',label: 'Inputs' },
    { id: 'video_object_detection',label: 'Video' },
    { id: 'finalize',              label: 'Summary' },
    { id: 'main',                  label: 'Complete' }
];

/*=====================================================================
  KEYBOARD LAYOUTS
=====================================================================*/
const keyboardLayouts = {
    normal: [
        ['1','2','3','4','5','6','7','8','9','0'],
        ['q','w','e','r','t','y','u','i','o','p'],
        ['a','s','d','f','g','h','j','k','l'],
        ['z','x','c','v','b','n','m']
    ],
    shift: [
        ['!','@','#','$','%','^','&','*','(',')'],
        ['Q','W','E','R','T','Y','U','I','O','P'],
        ['A','S','D','F','G','H','J','K','L'],
        ['Z','X','C','V','B','N','M']
    ]
};

/*=====================================================================
  STATE TEMPLATES
=====================================================================*/
const states = {
    loading: () => `
        <div class="loading"><div class="spinner"></div><p>Loading system...</p></div>
    `,
    welcome: () => `
        <h1>Welcome to Touch Meter</h1>
        <p>Begin the installation process for your meter system.</p>
        <div class="separator"></div>
        <div class="button-group">
            <button class="button" onclick="navigate('connect_select')">
                <span class="material-icons">play_arrow</span> Start Installation
            </button>
        </div>
    `,
    connect_select: (currentSSID = null) => `
        <h1>Select Connectivity</h1>
        <p>Choose your preferred connection method</p>
        <div id="error" class="error" style="display:none;"></div>
        ${currentSSID ? `
            <div style="padding:1rem;background:hsl(var(--muted));border-radius:var(--radius);margin:1rem 0;">
                <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem;">
                    <span class="material-icons" style="color:hsl(var(--success));">wifi</span>
                    <strong>Connected to Wi-Fi</strong>
                </div>
                <p style="margin:0;padding-left:2rem;font-weight:600;">${currentSSID}</p>
            </div>
            <div class="button-group">
                <button class="button" onclick="navigate('network_test','wifi')">
                    <span class="material-icons">arrow_forward</span> Continue with Wi-Fi
                </button>
                <button class="button secondary" onclick="showWiFiPopup()">
                    <span class="material-icons">settings</span> Change Wi-Fi
                </button>
            </div>
        ` : `
            <div class="button-group">
                <button class="button" onclick="checkWiFiConnection()">
                    <span class="material-icons">wifi</span> Wi-Fi
                </button>
                <button class="button" onclick="navigate('network_test','gsm')">
                    <span class="material-icons">cell_tower</span> GSM
                </button>
            </div>
        `}
    `,
    network_test: (status = null) => `
        <h1>Network Test</h1>
        <p>Verifying ${connectivityMode.toUpperCase()} connection</p>
        <div id="error" class="error" style="display:none;"></div>
        ${status === 'success' ? `
            <div class="success"><span class="material-icons">check_circle</span> Network test successful!</div>
            <div class="button-group">
                <button class="button" onclick="navigate('display_meter')">
                    <span class="material-icons">arrow_forward</span> Next
                </button>
            </div>
        ` : status === 'error' ? `
            <div class="error" style="display:flex;">
                <span class="material-icons">error</span> Network test failed. Please check your connection.
            </div>
            <div class="button-group">
                <button class="button" onclick="navigate('network_test','${connectivityMode}')">
                    <span class="material-icons">refresh</span> Retry
                </button>
                <button class="button secondary" onclick="navigate('connect_select')">
                    <span class="material-icons">arrow_back</span> Back
                </button>
            </div>
        ` : `
            <div class="loading"><div class="spinner"></div><p>Testing connection...</p></div>
        `}
    `,
    display_meter: () => `
        <h1>Meter ID</h1>
        <p>Your meter identification number</p>
        <div style="padding:1.5rem;background:hsl(var(--muted));border-radius:var(--radius);margin:1.5rem 0;text-align:center;">
            <div style="display:flex;align-items:center;justify-content:center;gap:.5rem;margin-bottom:.5rem;">
                <span class="material-icons" style="color:hsl(var(--primary));font-size:2rem;">electric_meter</span>
            </div>
            <strong style="font-size:1.5rem;color:hsl(var(--foreground));">${meterId}</strong>
        </div>
        <div class="button-group">
            <button class="button" onclick="navigate('hhid_input')">
                <span class="material-icons">arrow_forward</span> Next
            </button>
        </div>
    `,
    hhid_input: () => `
        <h1>Enter Household ID</h1>
        <p>Please provide your household identification number</p>
        <div id="error" class="error" style="display:none;"></div>
        <input type="text" id="hhid" placeholder="Enter HHID (e.g. HH1002)" onfocus="showKeyboard(this)">
        <div class="button-group">
            <button class="button" onclick="submitHHID()">
                <span class="material-icons">send</span> Submit & Send OTP
            </button>
            <button class="button secondary" onclick="navigate('display_meter')">
                <span class="material-icons">arrow_back</span> Back
            </button>
        </div>
    `,
    otp_verification: () => `
        <h1>Enter OTP</h1>
        <p>Check your email. Enter the 4-digit code.</p>
        <div id="error" class="error" style="display:none;"></div>
        <input type="text" id="otp" placeholder="Enter 4-digit OTP" maxlength="4" onfocus="showKeyboard(this)">
        <div class="button-group">
            <button class="button" onclick="submitOTP()">
                <span class="material-icons">verified</span> Verify OTP
            </button>
            <button class="button secondary" onclick="navigate('hhid_input')">
                <span class="material-icons">arrow_back</span> Back
            </button>
        </div>
    `,
    input_source_detection: () => `
        <h1>Input Sources</h1>
        <p>Detected input sources on your system</p>
        <div id="error" class="error" style="display:none;"></div>
        <ul>
            ${inputSources.length ? inputSources.map(s=>`<li><span class="material-icons">input</span> ${s}</li>`).join('') :
              '<li><span class="material-icons">info</span>No sources detected</li>'}
        </ul>
        <div class="button-group">
            <button class="button" onclick="navigate('video_object_detection')">
                <span class="material-icons">arrow_forward</span> Next
            </button>
            <button class="button secondary" onclick="navigate('otp_verification')">
                <span class="material-icons">arrow_back</span> Back
            </button>
        </div>
    `,
    video_object_detection: () => `
        <h1>Video Detection</h1>
        <p>Checking video object detection capabilities</p>
        <div class="loading"><div class="spinner"></div><p>Running detection test...</p></div>
    `,
    finalize: (details) => `
        <h1>Installation Summary</h1>
        <p>Review your installation details</p>
        <div id="error" class="error" style="display:none;"></div>
        <table class="details-table">
            <tr><th><span class="material-icons">electric_meter</span>Meter ID</th><td>${details.meter_id}</td></tr>
            <tr><th><span class="material-icons">home</span>Household ID</th><td>${details.hhid||'Not set'}</td></tr>
            <tr><th><span class="material-icons">signal_cellular_alt</span>Connectivity</th><td>${details.connectivity}</td></tr>
            <tr><th><span class="material-icons">input</span>Input Sources</th><td>${details.input_sources.join(', ')||'None'}</td></tr>
            <tr><th><span class="material-icons">videocam</span>Video Detection</th><td>${details.video_detection?'Working':'Not working'}</td></tr>
        </table>
        <div class="button-group">
            <button class="button" onclick="finalizeInstallation()">
                <span class="material-icons">check_circle</span> Finalize Installation
            </button>
            <button class="button secondary" onclick="navigate('video_object_detection')">
                <span class="material-icons">arrow_back</span> Back
            </button>
        </div>
    `,
    main: () => {
        const max = 8;
        const members = membersData?.members || [];
        const shown = members.slice(0,max);
        const empty = max - shown.length;

        const avatar = (g,a) => {
            if(!g||!a) return '/static/assets/default.png';
            const gen = g.toLowerCase();
            let cat = 'middle';
            if(a<=12) cat='kid';
            else if(a<=19) cat='teen';
            else if(a<=40) cat='middle';
            else if(a<=60) cat='aged';
            else cat='elder';
            return `/static/assets/${gen}-${cat}.png`;
        };

        return `
            <div class="main-dashboard">
                <div class="members-grid">
                    ${shown.map((m,i)=>`
                        <div class="member-card-grid ${m.active===false?'inactive':'active'}"
                             onclick="toggleMember(${i})"
                             style="--bg-image:url('${avatar(m.gender,m.age)}')">
                            <div class="name-tag">${m.name||'Unknown'}</div>
                        </div>
                    `).join('')}
                    ${Array(empty).fill().map(()=>`
                        <div class="member-card-grid empty"><div class="name-tag">—</div></div>
                    `).join('')}
                </div>
                <div class="bottom-bar">
                    <button class="bar-btn" onclick="showWiFiPopup()"><span class="material-icons">wifi</span><span>Wi-Fi</span></button>
                    <button class="bar-btn" onclick="restart()"><span class="material-icons">restart_alt</span><span>Reboot</span></button>
                    <button class="bar-btn" onclick="shutdown()"><span class="material-icons">power_settings_new</span><span>Shutdown</span></button>
                </div>
            </div>
        `;
    }
};

/*=====================================================================
  KEYBOARD
=====================================================================*/
function showKeyboard(el){
    activeInput = el;
    const existing = document.getElementById('virtual-keyboard');
    if(existing){ renderKeys(); scrollInputIntoView(); return; }

    const kb = document.createElement('div');
    kb.id = 'virtual-keyboard';
    kb.className = 'virtual-keyboard';
    kb.innerHTML = `
        <div class="keyboard-header">
            <span class="keyboard-title"><span class="material-icons">keyboard</span> Keyboard</span>
            <button class="keyboard-close" onclick="hideKeyboard()"><span class="material-icons">close</span></button>
        </div>
        <div class="keyboard-body">
            <div class="keyboard-keys" id="keyboard-keys"></div>
            <div class="keyboard-bottom-row">
                <button class="key-special key-shift" onclick="toggleShift()"><span class="material-icons">arrow_upward</span><span class="key-label">Shift</span></button>
                <button class="key key-space" onclick="insertChar(' ')">Space</button>
                <button class="key-special key-backspace" onclick="backspace()"><span class="material-icons">backspace</span></button>
                <button class="key-special key-enter" onclick="pressEnter()"><span class="material-icons">keyboard_return</span><span class="key-label">Enter</span></button>
            </div>
        </div>`;
    document.body.appendChild(kb);
    renderKeys();
    scrollInputIntoView();

    kb.addEventListener('click',e=>e.stopPropagation());
    el.addEventListener('focus',e=>e.stopPropagation());
}
function renderKeys(){
    const c = document.getElementById('keyboard-keys');
    if(!c) return;
    const layout = shiftActive ? keyboardLayouts.shift : keyboardLayouts.normal;
    c.innerHTML = layout.map((r,i)=>`
        <div class="keyboard-row keyboard-row-${i}">
            ${r.map(k=>`<button class="key" onclick="insertChar('${k}')">${k}</button>`).join('')}
        </div>`).join('');
}
function toggleShift(){
    shiftActive = !shiftActive;
    const btn = document.querySelector('.key-shift');
    if(btn) btn.classList.toggle('active',shiftActive);
    renderKeys();
}
function insertChar(ch){
    if(!activeInput) return;
    const s = activeInput.selectionStart||0, e = activeInput.selectionEnd||0;
    activeInput.value = activeInput.value.slice(0,s)+ch+activeInput.value.slice(e);
    const np = s+ch.length;
    activeInput.selectionStart = activeInput.selectionEnd = np;
    scrollInputIntoView();
    if(shiftActive && /[A-Z]/.test(ch)){
        setTimeout(()=>{ shiftActive=false; const b=document.querySelector('.key-shift'); if(b) b.classList.remove('active'); renderKeys(); },100);
    }
}
function backspace(){
    if(!activeInput) return;
    const s=activeInput.selectionStart||0, e=activeInput.selectionEnd||0;
    if(s!==e){ activeInput.value = activeInput.value.slice(0,s)+activeInput.value.slice(e); activeInput.selectionStart=activeInput.selectionEnd=s; }
    else if(s>0){ activeInput.value = activeInput.value.slice(0,s-1)+activeInput.value.slice(s); activeInput.selectionStart=activeInput.selectionEnd=s-1; }
    scrollInputIntoView();
}
function pressEnter(){
    if(!activeInput) return;
    hideKeyboard();
    if(activeInput.id==='hhid') submitHHID();
    else if(activeInput.id==='otp') submitOTP();
}
function hideKeyboard(){
    const kb = document.getElementById('virtual-keyboard');
    if(kb){ kb.classList.add('hiding'); setTimeout(()=>kb.remove(),300); }
    activeInput = null; shiftActive = false;
}
function scrollInputIntoView(){
    if(!activeInput) return;
    requestAnimationFrame(()=>{
        const r = activeInput.getBoundingClientRect();
        const kb = document.getElementById('virtual-keyboard');
        if(!kb) return;
        const kbTop = kb.getBoundingClientRect().top;
        const bottom = r.bottom;
        if(bottom > kbTop-100){
            const amt = bottom - (kbTop-120);
            window.scrollBy(0,amt);
        }
        activeInput.focus();
    });
}
document.addEventListener('click',e=>{
    const kb = document.getElementById('virtual-keyboard');
    const inp = e.target.closest('input[type="text"],input[type="password"]');
    if(kb && !e.target.closest('.virtual-keyboard')){
        if(inp){ activeInput=inp; renderKeys(); scrollInputIntoView(); }
        else hideKeyboard();
    }
});

/*=====================================================================
  RENDER & PROGRESS
=====================================================================*/
function render(details = null){
    const html = (typeof details === 'string') ? states[currentState](details) : states[currentState](details);

    if(currentState==='main'){
        container.innerHTML = html;
        progressBar.style.display='none';
        setTimeout(()=>{
            document.querySelectorAll('.member-card-grid').forEach(c=>{
                const bg=c.style.getPropertyValue('--bg-image')||'';
                if(bg) c.style.setProperty('--card-bg',bg);
            });
        },10);
    }else{
        container.innerHTML = `
            <div class="container"><div class="card"><div id="progress-bar-temp"></div>${html}</div></div>`;
        const tmp = container.querySelector('#progress-bar-temp');
        if(tmp && progressBar){
            tmp.parentNode.insertBefore(progressBar,tmp);
            tmp.remove();
            progressBar.style.display='flex';
            updateProgressBar();
        }
    }
}
function updateProgressBar(){
    if(!progressBar) return;
    const idx = steps.findIndex(s=>s.id===currentState);
    progressBar.innerHTML = steps.map((_,i)=>`<div class="progress-step ${i<=idx?'active':''}"></div>`).join('');
}

/*=====================================================================
  ERROR
=====================================================================*/
function showError(msg,type='error'){
    const el = document.getElementById('error');
    if(el){
        el.innerHTML = `<span class="material-icons">${type==='success'?'check_circle':'error'}</span> ${msg}`;
        el.className = type;
        el.style.display='flex';
        if(type==='success') setTimeout(()=>el.style.display='none',3000);
    }
}

/*=====================================================================
  WIFI POPUP
=====================================================================*/
async function showWiFiPopup(){
    closeWiFiPopup();
    const popup = document.createElement('div'); popup.id='wifi-popup'; popup.className='popup';
    const overlay = document.createElement('div'); overlay.id='wifi-overlay'; overlay.className='overlay';
    overlay.onclick = closeWiFiPopup;
    popup.innerHTML = `
        <h2><span class="material-icons">wifi</span> Select Wi-Fi</h2>
        <p>Choose a network to connect</p>
        <div id="wifi-error" class="error" style="display:none;"></div>
        <select id="ssid" onchange="togglePasswordField()"><option>Select Network</option></select>
        <input type="password" id="password" placeholder="Password" style="display:none;" onfocus="showKeyboard(this)">
        <div class="button-group">
            <button class="button" onclick="connectWiFi()">Connect</button>
            <button class="button secondary" onclick="disconnectWiFi()">Disconnect</button>
            <button class="button secondary" onclick="closeWiFiPopup()">Close</button>
        </div>`;
    document.body.append(overlay,popup);
    await scanWiFi();
}
async function scanWiFi(){
    const sel = document.getElementById('ssid');
    const err = document.getElementById('wifi-error');
    if(!sel||!err) return;
    try{
        const r = await fetch('/api/wifi/networks');
        const d = await r.json();
        if(d.success){
            sel.innerHTML = '<option>Select Network</option>';
            d.networks.forEach(n=>{
                const o=document.createElement('option');
                o.value=n.ssid;
                o.textContent=`${n.ssid} (${n.signal_strength}, ${n.security})`;
                sel.appendChild(o);
            });
        }else{
            err.innerHTML=`<span class="material-icons">error</span> ${d.error}`;
            err.style.display='flex';
        }
    }catch(e){
        err.innerHTML='<span class="material-icons">error</span> Scan failed';
        err.style.display='flex';
    }
}
function togglePasswordField(){
    const pw = document.getElementById('password');
    const ss = document.getElementById('ssid');
    if(pw && ss) pw.style.display = ss.value?'block':'none';
}
async function connectWiFi(){
    const ssid = document.getElementById('ssid')?.value;
    const pass = document.getElementById('password')?.value;
    const err  = document.getElementById('wifi-error');
    if(!err) return;
    if(!ssid||!pass){
        err.innerHTML='<span class="material-icons">error</span> SSID & password required';
        err.className='error';
        err.style.display='flex';
        return;
    }
    try{
        const r = await fetch('/api/wifi/connect',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ssid,password:pass})
        });
        const d = await r.json();
        err.className = d.success?'success':'error';
        err.innerHTML = `<span class="material-icons">${d.success?'check_circle':'error'}</span> ${d.success?'Connected!':d.error}`;
        err.style.display='flex';
        if(d.success) setTimeout(()=>{closeWiFiPopup(); navigate('network_test','wifi');},2000);
    }catch(e){
        err.innerHTML='<span class="material-icons">error</span> Connection failed';
        err.style.display='flex';
    }
}
async function disconnectWiFi(){
    const err = document.getElementById('wifi-error');
    if(!err) return;
    try{
        const r = await fetch('/api/wifi/disconnect',{method:'POST'});
        const d = await r.json();
        err.className = d.success?'success':'error';
        err.innerHTML = `<span class="material-icons">${d.success?'check_circle':'error'}</span> ${d.message||d.error}`;
        err.style.display='flex';
        if(d.success) setTimeout(scanWiFi,2000);
    }catch(e){
        err.innerHTML='<span class="material-icons">error</span> Disconnect failed';
        err.style.display='flex';
    }
}
function closeWiFiPopup(){
    ['wifi-popup','wifi-overlay'].forEach(id=>{
        const el=document.getElementById(id);
        if(el) el.remove();
    });
    render();
}

/*=====================================================================
  NAVIGATION & WIFI CHECK
=====================================================================*/
async function checkWiFiConnection(){
    try{
        const r = await fetch('/api/check_wifi');
        const d = await r.json();
        if(d.success){
            const cur = await fetch('/api/current_wifi');
            const cd = await cur.json();
            if(cd.success){
                navigate('connect_select', cd.ssid);   // already connected → show SSID
            }else{
                showWiFiPopup();                       // not connected → popup
            }
        }else{
            showWiFiPopup();
        }
    }catch(e){
        showError('Wi-Fi check failed');
        render();
    }
}
async function navigate(state, param = null){
    currentState = state;

    if(state==='network_test'){
        connectivityMode = param;
        render();                                   // show "testing..."
        setTimeout(()=>{
            render('success');
            setTimeout(()=>navigate('display_meter'),1500);
        },2000);
        return;
    }
    if(state==='input_source_detection'){
        inputSources = ['HDMI1','USB-C'];
        render();
        return;
    }
    if(state==='video_object_detection'){
        render();
        setTimeout(()=>navigate('finalize'),3000);
        return;
    }
    if(state==='finalize'){
        render({meter_id:meterId, hhid, connectivity:connectivityMode.toUpperCase(),
                input_sources:inputSources, video_detection:true});
        return;
    }
    if(state==='main') await fetchMembers();

    render(param);   // param = currentSSID for connect_select
}

/*=====================================================================
  API CALLS
=====================================================================*/
async function submitHHID(){
    hhid = document.getElementById('hhid')?.value.trim();
    if(!hhid) return showError('Enter HHID');
    const btn = event?.target;
    if(btn){ btn.disabled=true; btn.innerHTML='<span class="material-icons">hourglass_top</span> Sending...'; }
    try{
        const r = await fetch('/api/submit_hhid',{
            method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hhid})
        });
        const d = await r.json();
        if(d.success){
            showError('OTP sent! Check email.','success');
            setTimeout(()=>navigate('otp_verification'),1500);
        }else showError(d.error||'Invalid HHID');
    }catch(e){ showError('Network error'); }
    finally{ if(btn){ btn.disabled=false; btn.innerHTML='<span class="material-icons">send</span> Submit & Send OTP'; } }
}
async function submitOTP(){
    const otp = document.getElementById('otp')?.value.trim();
    if(!otp||otp.length!==4) return showError('Enter 4-digit OTP');
    const btn = event?.target;
    if(btn){ btn.disabled=true; btn.innerHTML='<span class="material-icons">hourglass_top</span> Verifying...'; }
    try{
        const r = await fetch('/api/submit_otp',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({hhid,otp})
        });
        const d = await r.json();
        if(d.success) navigate('input_source_detection');
        else showError(d.error||'Invalid OTP');
    }catch(e){ showError('Network error'); }
    finally{ if(btn){ btn.disabled=false; btn.innerHTML='<span class="material-icons">verified</span> Verify OTP'; } }
}
async function finalizeInstallation(){
    const btn = event?.target;
    if(btn){ btn.disabled=true; btn.innerHTML='<span class="material-icons">hourglass_top</span> Finalizing...'; }
    try{
        const r = await fetch('/api/finalize',{method:'POST'});
        const d = await r.json();
        if(d.success){
            membersData = d.data;
            navigate('main');
        }else showError(d.error);
    }catch(e){ showError('Failed to finalize'); }
    finally{ if(btn){ btn.disabled=false; btn.innerHTML='<span class="material-icons">check_circle</span> Finalize Installation'; } }
}
async function fetchMembers(){
    try{
        const r = await fetch('/api/members');
        const d = await r.json();
        if(d.success) membersData = d.data;
    }catch(e){ console.error(e); }
}
async function toggleMember(idx){
    if(!membersData?.members?.[idx]) return;
    try{
        const r = await fetch('/api/toggle_member_status',{
            method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({index:idx})
        });
        const d = await r.json();
        if(d.success){
            membersData.members[idx] = d.member;
            render();
        }else showError(d.error||'Failed to update');
    }catch(e){ showError('Network error'); }
}
async function shutdown(){
    if(!confirm('Shutdown system?')) return;
    try{
        const r = await fetch('/api/shutdown',{method:'POST'});
        const d = await r.json();
        alert(d.success?'Shutting down...':d.error);
    }catch(e){ alert('Shutdown failed'); }
}
async function restart(){
    if(!confirm('Restart system?')) return;
    try{
        const r = await fetch('/api/restart',{method:'POST'});
        const d = await r.json();
        alert(d.success?'Restarting...':d.error);
    }catch(e){ alert('Restart failed'); }
}

/*=====================================================================
  INIT
=====================================================================*/
async function init(){
    try{
        const r = await fetch('/api/check_installation');
        const d = await r.json();
        meterId = d.meter_id;
        currentState = d.installed ? 'main' : 'welcome';
        if(d.installed) await fetchMembers();
        render();
    }catch(e){
        currentState = 'welcome';
        render();
    }
}
init();