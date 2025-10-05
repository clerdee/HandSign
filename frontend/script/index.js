// Access camera
const video = document.getElementById('video');

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' } 
        });
        video.srcObject = stream;
    } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Could not access camera. Please ensure camera permissions are granted.');
    }
}

// Start camera when page loads
startCamera();

// Button functionality
document.querySelectorAll('.button').forEach(button => {
    button.addEventListener('click', function() {
        const text = this.textContent.trim();
        if (text.includes('Play Audio')) {
            alert('Audio playback feature');
        } else if (text.includes('Save Translation')) {
            alert('Translation saved!');
        } else if (text.includes('Clear')) {
            document.querySelector('.translated-text').textContent = '""';
            setTimeout(() => {
                document.querySelector('.translated-text').textContent = '"Kumusta"';
            }, 1000);
        }
    });
});