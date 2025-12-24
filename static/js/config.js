/* ==============================================================
   config.js
   All immutable constants & configuration – loaded first
   ============================================================== */

// Main DOM containers
const container = document.getElementById('main-content');
const progressBar = document.getElementById('progress-bar');

// Progress bar steps
const steps = [
    { id: 'welcome', label: 'Start' },
    { id: 'connect_select', label: 'Connect' },
    { id: 'network_test', label: 'Network' },
    { id: 'display_meter', label: 'Meter ID' },
    { id: 'hhid_input', label: 'HHID' },
    { id: 'otp_verification', label: 'OTP' },
    { id: 'input_source_detection', label: 'Inputs' },
    { id: 'video_object_detection', label: 'Video' },
    { id: 'finalize', label: 'Summary' },
    { id: 'main', label: 'Complete' }
];

// Virtual keyboard layouts
const keyboardLayouts = {
    normal: [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ],
    shift: [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
    ],
    special: [
        ['!', '@', '#', '$', '%', '^', '&', '*', '('],
        [')', '-', '+', '=', '{', '}', '[', ']', '|'],
        ['\\', '/', ';', ':', '\'', '"', ',', '<', '>'],
        ['?', '`', '~', '_', '.']
    ]
};

// Guest limits
const MAX_GUESTS = 8;