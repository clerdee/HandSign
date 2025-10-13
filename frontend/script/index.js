// index.js
// =========================
// CAMERA CONTROL
// =========================
const video = document.getElementById('video');
const toggleBtn = document.getElementById('toggleCameraBtn');
const cameraStatus = document.getElementById('cameraStatus');
const translatedText = document.querySelector('.translated-text');

let stream = null;
let cameraOn = false; 
let intervalId = null; 

// =========================
// TEXT TO SPEECH (Web Speech API)
// =========================
const synth = window.speechSynthesis;
let availableVoices = [];

function refreshVoices() {
    try {
        availableVoices = synth.getVoices();
    } catch (_) {
        availableVoices = [];
    }
}

// Load voices (async on some browsers)
refreshVoices();
if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = refreshVoices;
}

function pickBestVoice() {
    if (!availableVoices || availableVoices.length === 0) return null;
    const prefers = ['fil-PH', 'tl-PH', 'en-PH', 'en-US', 'en-GB'];

    // Exact startsWith preference
    for (const pref of prefers) {
        const match = availableVoices.find(v => (v.lang || '').toLowerCase().startsWith(pref.toLowerCase()));
        if (match) return match;
    }

    // Fuzzy contains
    const fuzzy = availableVoices.find(v => /(fil|tl|ph)/i.test(v.lang || ''));
    return fuzzy || availableVoices[0] || null;
}

function speakText(text) {
    const content = (text || '').trim();
    if (!content) return;

    const utterance = new SpeechSynthesisUtterance(content);
    const voice = pickBestVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
    utterance.rate = 0.95; // slightly slower for clarity
    utterance.pitch = 1.0;

    try { synth.cancel(); } catch (_) {}
    synth.speak(utterance);
}

// frames to backend every second
async function sendFrameToBackend() {
    if (!video || !cameraOn) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg');

    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        const result = await response.json();
        console.log("🔹 Prediction result:", result);

        // Make sure backend returns { "sign": "..." }
        if (result.sign && result.sign !== "Processing..." && result.sign !== "Error") {
            let currentText = translatedText.textContent.replace(/"/g, '');
            // Avoid repeating the same letter many times in a row
            if (!currentText.endsWith(result.sign)) {
                translatedText.textContent = `"${currentText + result.sign}"`;
            }
        }
        else if (result.error) {
            translatedText.textContent = `"Error: ${result.error}"`;
        }
        } catch (err) {
            console.error('Prediction error:', err);
        }
}

// When camera starts, begin sending frames
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        video.srcObject = stream;
        cameraOn = true;
        updateCameraStatus(true);

        // Start sending frames every 500ms
        intervalId = setInterval(sendFrameToBackend, 500);
    } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Could not access the camera.');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    cameraOn = false;
    updateCameraStatus(false);

    if (intervalId) clearInterval(intervalId);
}

// Update UI
function updateCameraStatus(isOn) {
    if (isOn) {
        cameraStatus.classList.remove('offline');
        cameraStatus.classList.add('online');
        cameraStatus.innerHTML = `<span class="status-dot"></span> CAMERA ACTIVE`;
        toggleBtn.textContent = 'Turn Off Camera';
    } else {
        cameraStatus.classList.remove('online');
        cameraStatus.classList.add('offline');
        cameraStatus.innerHTML = `<span class="status-dot"></span> CAMERA OFF`;
        toggleBtn.textContent = 'Turn On Camera';
    }
}

// Toggle button click
toggleBtn.addEventListener('click', () => {
    if (cameraOn) stopCamera();
    else startCamera();
});

// 🔹 Initialize page with camera OFF
updateCameraStatus(false);

// =========================
// FRAME CAPTURE + SEND TO BACKEND
// =========================
// function startFrameCapture() {
//     const canvas = document.createElement('canvas');
//     const context = canvas.getContext('2d');

//     intervalId = setInterval(async () => {
//         if (!cameraOn) return;

//         canvas.width = video.videoWidth;
//         canvas.height = video.videoHeight;
//         context.drawImage(video, 0, 0, canvas.width, canvas.height);

//         const frameData = canvas.toDataURL('image/jpeg');

//         try {
//             const response = await fetch('/api/predict', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ image: frameData })
//             });

//             const result = await response.json();
//             if (result.translation) {
//                 translatedText.textContent = `"${result.sign}"`;
//             }
//         } catch (err) {
//             console.error('Error sending frame:', err);
//         }
//     }, 1000); 
// }

// function stopFrameCapture() {
//     if (intervalId) clearInterval(intervalId);
// }

// =========================
// REMINDER MODAL
// =========================
window.addEventListener('load', () => {
    const modal = document.getElementById('reminderModal');
    const closeBtn = document.getElementById('closeModalBtn');
    if (modal && closeBtn) {
        modal.style.display = 'flex';
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
});

// =========================
// BUTTON ACTIONS
// =========================
document.querySelectorAll('.button').forEach(button => {
    button.addEventListener('click', function() {
        const text = this.textContent.trim();
        if (text.includes('Play Audio')) {
            const currentText = translatedText.textContent.replace(/"/g, '').trim();
            speakText(currentText);
        } else if (text.includes('Save Translation')) {
            alert('Translation saved!');
        } else if (text.includes('Clear')) {
            translatedText.textContent = '""';
        }
    });
});

// =========================
// LOGOUT + BACKSPACE BUTTONS
// =========================
const logoutBtn = document.getElementById('logoutBtn');
const backspaceBtn = document.getElementById('backspaceBtn');

// 🔹 Logout Button Logic
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        const confirmLogout = confirm('Are you sure you want to logout?');
        if (confirmLogout) {
            // Option 1: clear local/session storage
            localStorage.clear();
            sessionStorage.clear();

            // Option 2: redirect to login or home page
            window.location.href = 'login.html'; // change path if needed
        }
    });
}

// 🔹 Backspace Button Logic
if (backspaceBtn) {
    backspaceBtn.addEventListener('click', () => {
        let currentText = translatedText.textContent.replace(/"/g, '').trim();
        if (currentText.length > 0) {
            currentText = currentText.slice(0, -1);
            translatedText.textContent = `"${currentText}"`;
        }
    });
}