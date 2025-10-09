// =========================
// CAMERA CONTROL
// =========================
const video = document.getElementById('video');
const toggleBtn = document.getElementById('toggleCameraBtn');
const cameraStatus = document.getElementById('cameraStatus');
const translatedText = document.querySelector('.translated-text');

let stream = null;
let cameraOn = false; // Camera is OFF by default
let intervalId = null; // For sending frames periodically

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
        if (result.sign) {
            document.querySelector('.translated-text').textContent = `"${result.sign}"`;
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
function startFrameCapture() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    intervalId = setInterval(async () => {
        if (!cameraOn) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert frame to base64
        const frameData = canvas.toDataURL('image/jpeg');

        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: frameData })
            });

            const result = await response.json();
            if (result.translation) {
                translatedText.textContent = `"${result.sign}"`;
            }
        } catch (err) {
            console.error('Error sending frame:', err);
        }
    }, 1000); // send 1 frame per second
}

function stopFrameCapture() {
    if (intervalId) clearInterval(intervalId);
}

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
            alert('Audio playback feature');
        } else if (text.includes('Save Translation')) {
            alert('Translation saved!');
        } else if (text.includes('Clear')) {
            translatedText.textContent = '""';
        }
    });
});
