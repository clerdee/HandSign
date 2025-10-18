// index.js
// =========================
// CAMERA CONTROL
// =========================
const video = document.getElementById('video');
const toggleBtn = document.getElementById('toggleCameraBtn');
const cameraStatus = document.getElementById('cameraStatus');
const translatedText = document.querySelector('.translated-text');
const detectionStatusText = document.getElementById('detectionStatusText');
const detectionConfidence = document.getElementById('detectionConfidence');
const detectedSign = document.getElementById('detectedSign');

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

// Predict request throttle + downscale/compress for speed
let inflight = false;
const SESSION_ID = (() => Math.random().toString(36).slice(2))();

async function sendFrameToBackend() {
    if (!video || !cameraOn || inflight) return;

    const vw = video.videoWidth || 0;
    const vh = video.videoHeight || 0;
    if (!vw || !vh) return;

    inflight = true;
    const canvas = document.createElement('canvas');
    // Downscale to reduce payload and CPU on server
    const targetW = 320;
    const scale = Math.min(1, targetW / vw);
    canvas.width = Math.max(1, Math.floor(vw * scale));
    canvas.height = Math.max(1, Math.floor(vh * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Prefer WebP if supported; fallback to JPEG otherwise
    let base64Image;
    try {
        base64Image = canvas.toDataURL('image/webp', 0.7);
    } catch (_) {
        base64Image = canvas.toDataURL('image/jpeg', 0.7);
    }

    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image, sessionId: SESSION_ID })
        });

        const result = await response.json();
        if (result.error) {
            detectionStatusText.textContent = 'Error';
            detectionConfidence.textContent = '—';
            detectedSign.textContent = '—';
        } else if (result.sign && result.sign !== "Processing..." && result.sign !== "Error") {
            detectionStatusText.textContent = 'Hand detected';
            detectedSign.textContent = result.sign;
            detectionConfidence.textContent =
                typeof result.confidence === 'number'
                    ? `${Math.round(result.confidence * 100)}%`
                    : '—';

            const currentText = translatedText.textContent.trim();
            // Avoid repeating the same letter many times in a row
            if (!currentText.endsWith(result.sign)) {
                translatedText.textContent = currentText + result.sign;
            }
        } else {
            detectionStatusText.textContent = cameraOn ? 'Scanning...' : 'Camera off';
            detectionConfidence.textContent = '—';
            detectedSign.textContent = '—';
        }
    } catch (err) {
        console.error('Prediction error:', err);
    } finally {
        inflight = false;
    }
}

// When camera starts, begin sending frames
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        video.srcObject = stream;
        cameraOn = true;
        updateCameraStatus(true);
        detectionStatusText.textContent = 'Scanning...';
        detectionConfidence.textContent = '—';
        detectedSign.textContent = '—';

        // Start sending frames every 250ms; request is throttled by inflight flag
        intervalId = setInterval(sendFrameToBackend, 250);
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
    detectionStatusText.textContent = 'Camera off';
    detectionConfidence.textContent = '—';
    detectedSign.textContent = '—';

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
// SPEECH TO TEXT
// =========================
const micBtn = document.getElementById('micBtn');
const speechTranslatedText = document.querySelector('.translated-text');

const micStatus = document.createElement('div');
micStatus.id = 'micStatus';
micStatus.className = 'mic-status offline';
micStatus.innerHTML = `<span class="status-dot"></span> MICROPHONE OFF`;
const detectionInfo = document.getElementById('detectionInfo');
if (detectionInfo && detectionInfo.parentNode) {
    detectionInfo.parentNode.insertBefore(micStatus, detectionInfo.nextSibling);
}

let isListening = false;

function updateMicUI(active) {
    micStatus.classList.toggle('online', active);
    micStatus.classList.toggle('offline', !active);
    micStatus.innerHTML = active
        ? `<span class="status-dot"></span> MICROPHONE LISTENING - SPEAK NOW`
        : `<span class="status-dot"></span> MICROPHONE OFF`;

    micBtn.textContent = active ? '🎤 Listening...' : '🎤 Microphone';
    micBtn.style.backgroundColor = active ? '#e74c3c' : '';
}

function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert('Speech Recognition is not supported. Use Chrome or Edge.');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        console.log('🎤 Listening started');
        isListening = true;
        updateMicUI(true);
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        console.log('📝 Recognized:', transcript);

        speechTranslatedText.textContent = speechTranslatedText.textContent.trim()
            ? `${speechTranslatedText.textContent.trim()} ${transcript}`
            : transcript;

        speechTranslatedText.style.backgroundColor = '#d4edda';
        setTimeout(() => speechTranslatedText.style.backgroundColor = '', 500);
    };

    recognition.onerror = (event) => {
        console.error('❌ Speech error:', event.error);
        if (event.error === 'not-allowed') {
            alert('Microphone access was denied. Check browser permissions.');
        } else if (event.error === 'network') {
            alert('Network error: Speech recognition requires internet access.');
        }
        stopSpeechRecognition();
    };

    recognition.onend = () => {
        console.log('🔴 Listening stopped');
        isListening = false;
        updateMicUI(false);
    };

    try {
        recognition.start();
    } catch (err) {
        console.error('Failed to start recognition:', err);
    }
}

function stopSpeechRecognition() {
    isListening = false;
    updateMicUI(false);
}

micBtn.addEventListener('click', () => {
    if (isListening) stopSpeechRecognition();
    else startSpeechRecognition();
});

// =========================
// BUTTON ACTIONS
// =========================
document.querySelectorAll('.button').forEach(button => {
    button.addEventListener('click', function() {
        const text = this.textContent.trim();
        if (text.includes('Play Audio')) {
            const currentText = translatedText.textContent.trim();
            speakText(currentText);
        } else if (text.includes('Save Translation')) {
            alert('Translation saved!');
        } else if (text.includes('Clear')) {
            translatedText.textContent = '""';
        }
    });
});

// Helper functions to delete at cursor/selection within contenteditable translatedText
function getCaretIndex(el) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return el.textContent.length;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.startContainer)) return el.textContent.length;
    const preRange = range.cloneRange();
    preRange.selectNodeContents(el);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
}

function setCaret(el, index) {
    const selection = window.getSelection();
    const range = document.createRange();
    let remaining = index;
    let targetNode = null;
    let targetOffset = 0;

    for (const child of el.childNodes) {
        const len = child.textContent.length;
        if (remaining <= len) {
            targetNode = child.nodeType === Node.TEXT_NODE ? child : child.firstChild || child;
            targetOffset = Math.max(0, Math.min(remaining, (targetNode?.textContent || '').length));
            break;
        } else {
            remaining -= len;
        }
    }
    if (!targetNode) {
        targetNode = el;
        targetOffset = el.childNodes.length;
    }
    range.setStart(targetNode, targetOffset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function backspaceAtCursor(el) {
    el.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);

        if (!range.collapsed) {
            range.deleteContents();
            return;
        }
    }
    const text = el.textContent;
    const caret = getCaretIndex(el);
    if (caret <= 0) return;
    const newText = text.slice(0, caret - 1) + text.slice(caret);
    el.textContent = newText;
    setCaret(el, caret - 1);
}

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
            localStorage.clear();
            sessionStorage.clear();

            window.location.href = 'login.html'; 
        }
    });
}

// 🔹 Backspace Button Logic
if (backspaceBtn) {
    backspaceBtn.addEventListener('click', () => {
        backspaceAtCursor(translatedText);
    });
}