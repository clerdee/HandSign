// ===============================
// user-dashboard.js
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  
  // ===============================
  // DISPLAY BASIC PROFILE INFO IN HEADER
  // ===============================
  const user = JSON.parse(localStorage.getItem("user"));

  if (user) {
    const profileSection = document.getElementById("settings");

    const topbarTitle = document.querySelector(".topbar-title");
    const userImg = document.querySelector(".user-info img");
    const userName = document.querySelector(".user-info h3");
    const userEmail = document.querySelector(".user-info p");

    if (!profileSection.classList.contains("active")) {
      if (topbarTitle) topbarTitle.textContent = `👋 Welcome, ${user.name}!`;
      if (userImg) userImg.src = user.profilePic || "media/default-user.jpg";
      if (userName) userName.textContent = user.name;
      if (userEmail) userEmail.textContent = user.email;
    }
  } else {
    window.location.href = "handsign.html";
  }

  // ===============================
  // ELEMENT REFERENCES
  // ===============================
  const toggleCameraBtn = document.getElementById("toggleCameraBtn");
  const cameraStatus = document.getElementById("cameraStatus");
  const detectionStatusText = document.getElementById("detectionStatusText");
  const detectionConfidence = document.getElementById("detectionConfidence");
  const detectedSign = document.getElementById("detectedSign");
  const translatedText = document.getElementById("translatedText");
  const loadingStatus = document.getElementById("loadingStatus");
  const backspaceBtn = document.getElementById("backspaceBtn");
  const clearTextBtn = document.getElementById("clearTextBtn");
  const playAudioBtn = document.getElementById("playAudioBtn");
  const micBtn = document.getElementById("micBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const navLinks = document.querySelectorAll(".nav-links li");
  const sections = document.querySelectorAll(".content-section");
  const video = document.getElementById("video");
  const profileContainer = document.getElementById("profile-container");
  const reminderModal = document.getElementById("reminderModal");
  const closeModalBtn = document.getElementById("closeModalBtn");

  // ===============================
  // NAVIGATION BAR FUNCTIONALITY
  // ===============================
  navLinks.forEach(link => {
    link.addEventListener("click", async () => {
      navLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      const targetSection = link.dataset.section;

      sections.forEach(sec => {
        if (sec.id === targetSection) {
          sec.classList.remove("hidden");
          sec.classList.add("active");
        } else {
          sec.classList.remove("active");
          sec.classList.add("hidden");
        }
      });

      // -------------------------------
      // HIDE TOPBAR IF PROFILE SECTION
      // -------------------------------
      const topbar = document.querySelector(".topbar");
      if (targetSection === "settings") {
        topbar.style.display = "none";
      } else {
        topbar.style.display = "flex"; 
      }

      if (targetSection === "settings") {
        await loadProfileHTML();
        initProfile();
      }

      if (targetSection === "gesture") {
        await loadGestureHTML();
        initTextGesture();
      }
    });
  });

  // ===============================
  // LOAD PROFILE.HTML DYNAMICALLY
  // ===============================
  async function loadProfileHTML() {
    try {
      const response = await fetch("sections/profile.html");
      if (!response.ok) throw new Error("Failed to load profile.html");
      const html = await response.text();
      profileContainer.innerHTML = html;

      const script = document.createElement("script");
      script.src = "js/profile.js";
      script.defer = true;
      document.body.appendChild(script);
    } catch (err) {
      console.error("⚠️ Error loading profile:", err);
      profileContainer.innerHTML = `
        <div class="profile-container">
          <p style="color: red; text-align: center;">Failed to load Profile Settings.</p>
        </div>`;
    }
  }

  // ===============================
  // LOAD TEXTGESTURE.HTML DYNAMICALLY
  // ===============================
  async function loadGestureHTML() {
    const container = document.getElementById("textgesture-container");
    if (!container) return;

    try {
      const response = await fetch("sections/textgesture.html");
      if (!response.ok) throw new Error("Failed to load textgesture.html");
      const html = await response.text();
      container.innerHTML = html;

    } catch (err) {
      console.error("⚠️ Error loading Text-to-Gesture:", err);
      container.innerHTML = `
        <div class="textgesture-container">
          <p style="color: red; text-align: center;">Failed to load Text-to-Gesture section.</p>
        </div>`;
    }
  }

  // ===============================
  // CAMERA FUNCTIONALITY
  // ===============================
  let cameraOn = false;
  let stream = null;

  async function toggleCamera() {
    if (!toggleCameraBtn || !video) return;

    if (!cameraOn) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        cameraOn = true;
        toggleCameraBtn.textContent = "Turn Off Camera";
        cameraStatus.classList.add("online");
        cameraStatus.classList.remove("offline");
        cameraStatus.innerHTML = `<span class="status-dot"></span> CAMERA ACTIVE`;
        detectionStatusText.textContent = "Detecting...";
      } catch (error) {
        alert("Unable to access camera. Please check permissions.");
      }
    } else {
      if (stream) stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
      cameraOn = false;
      toggleCameraBtn.textContent = "Turn On Camera";
      cameraStatus.classList.remove("online");
      cameraStatus.classList.add("offline");
      cameraStatus.innerHTML = `<span class="status-dot offline-dot"></span> CAMERA OFFLINE`;
      detectionStatusText.textContent = "Camera off";
      detectionConfidence.textContent = "—";
      detectedSign.textContent = "—";
    }
  }

  if (toggleCameraBtn) toggleCameraBtn.addEventListener("click", toggleCamera);

  // ===============================
  // SEND FRAME TO BACKEND
  // ===============================
  async function sendFrameToBackend() {
    if (!cameraOn || !video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL("image/jpeg");

    detectionStatusText.textContent = "Processing...";
    loadingStatus.classList.remove("hidden");

    try {
      const response = await fetch("http://127.0.0.1:5000/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await response.json();
      loadingStatus.classList.add("hidden");

      if (data.error) {
        detectionStatusText.textContent = "Error";
        console.error("Prediction error:", data.error);
        return;
      }

      if (data.sign) {
        detectionStatusText.textContent = "Detected";
        detectedSign.textContent = data.sign;
        detectionConfidence.textContent = `${(data.confidence * 100).toFixed(2)}%`;
        translatedText.textContent += data.sign;
        saveTranslation(user.id, null, "gesture", "text", translatedText.textContent);
      } else {
        detectionStatusText.textContent = "No hand detected";
        detectedSign.textContent = "—";
        detectionConfidence.textContent = "—";
      }
    } catch (error) {
      console.error("Prediction request failed:", error);
      detectionStatusText.textContent = "Backend error";
      loadingStatus.classList.add("hidden");
    }
  }

  setInterval(() => {
    if (cameraOn) sendFrameToBackend();
  }, 2000);

  // ===============================
  // TEXT EDIT BUTTONS
  // ===============================
  if (backspaceBtn) {
    backspaceBtn.addEventListener("click", () => {
      translatedText.textContent = translatedText.textContent.slice(0, -1);
    });
  }

  if (clearTextBtn) {
    clearTextBtn.addEventListener("click", () => {
      translatedText.textContent = "";
    });
  }

  // ===============================
  // PLAY TRANSLATED TEXT AS AUDIO
  // ===============================
  if (playAudioBtn) {
    playAudioBtn.addEventListener("click", () => {
      const text = translatedText.textContent.trim();
      if (!text) return alert("No text to read.");

      // Play speech
      const speech = new SpeechSynthesisUtterance(text);
      speech.lang = "en-US";
      window.speechSynthesis.speak(speech);

      const user = JSON.parse(localStorage.getItem("user"));
      saveTranslation(user.id, null, "gesture", "speech", text);
    });
  }

  // ===============================
  // MICROPHONE SPEECH RECOGNITION
  // ===============================
  let micActive = false;
  let recognition;

  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      translatedText.textContent = transcript.trim();
    };
  }

  if (micBtn) {
    micBtn.addEventListener("click", () => {
      if (!recognition) return alert("Speech recognition not supported.");
      micActive = !micActive;
      if (micActive) {
        recognition.start();
        micBtn.textContent = "🎤 Listening...";
      } else {
        recognition.stop();
        micBtn.textContent = "🎤 Microphone";
      }
    });
  }

  // ===============================
  // LOGOUT FUNCTIONALITY
  // ===============================
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("user");
      window.location.href = "handsign.html";
    });
  }

  // ===============================
  // REMINDER MODAL
  // ===============================
  if (closeModalBtn && reminderModal) {
    closeModalBtn.addEventListener("click", () => {
      reminderModal.classList.add("hidden");
    });
  }
});

// ===============================
// SAVE TRANSLATION TO BACKEND
// ===============================
async function saveTranslation(userId, gestureId, inputType, outputType, translatedText) {
  try {
    await fetch("http://127.0.0.1:5000/api/save-translation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        gesture_id: gestureId,
        input_type: inputType,
        output_type: outputType,
        translated_text: translatedText
      }),
    });
  } catch (error) {
    console.error("⚠️ Failed to save translation:", error);
  }
}
