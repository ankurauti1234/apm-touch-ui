/* ==============================================================
   globals.js
   All mutable global variables – declared ONCE and only here
   ============================================================== */

let currentState = 'loading';
let meterId = '';
let hhid = '';
let connectivityMode = '';
let inputSources = [];
let membersData = null;
let activeInput = null;
let shiftActive = false;
let specialActive = false;

let guests = [];
let selectedSSID = '';
let availableNetworks = [];
let selectedMemberIndex = -1;
let CURRENT_HHID = null;

let screensaverTimeout = null;
let preDimTimeout = null;
let originalBrightness = 153;
let isDimmed = false;

let inputSourceRetryInterval = null;
let videoDetectionRetryInterval = null;

let wifiPopupLifted = false;