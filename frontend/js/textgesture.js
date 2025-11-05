// =======================================
// textgesture.js
// =======================================
function initTextGesture() {
  const inputText = document.getElementById("inputText");
  const translateGestureBtn = document.getElementById("translateGestureBtn");
  const speakTextBtn = document.getElementById("speakTextBtn");
  const clearInputBtn = document.getElementById("clearInputBtn");
  const gestureDisplay = document.getElementById("gestureDisplay");
  const gestureStatus = document.getElementById("gestureStatus");
  const speechStatus = document.getElementById("speechStatus");

  if (!inputText || !translateGestureBtn || !speakTextBtn || !clearInputBtn) {
    console.warn("Gesture elements not found — skipping init.");
    return;
  }

  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    console.error("⚠️ No user found in localStorage.");
    return;
  }

  // =======================================
  // TEXT → GESTURE
  // =======================================
  translateGestureBtn.addEventListener("click", async () => {
    const text = inputText.value.trim();
    if (!text) {
      gestureStatus.textContent = "Please enter text first.";
      return;
    }

    gestureDisplay.innerHTML = "";
    gestureStatus.textContent = "Translating to gestures...";

    try {
      const res = await fetch("http://127.0.0.1:5000/api/text-to-gesture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Server error while translating gestures.");

      const data = await res.json();
      gestureStatus.textContent = "Showing gestures...";

      for (const imgUrl of data.gestures) {
        const imgEl = document.createElement("img");
        imgEl.src = imgUrl;
        imgEl.alt = "Gesture";
        imgEl.classList.add("gesture-img");
        gestureDisplay.appendChild(imgEl);
        await new Promise((resolve) => setTimeout(resolve, 700));
      }

      gestureStatus.textContent = "Translation complete! ✅";

      await saveTranslation(user.id, null, "text", "gesture", text);

    } catch (err) {
      console.error("⚠️ Gesture translation error:", err);
      gestureStatus.textContent = "Error: Could not fetch gesture images.";
    }
  });

  // =======================================
  // TEXT → SPEECH
  // =======================================
  speakTextBtn.addEventListener("click", () => {
    const text = inputText.value.trim();
    if (!text) {
      speechStatus.textContent = "Speech: Please type text first.";
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);

    speechStatus.textContent = "Speech: Speaking...";
    utterance.onend = async () => {
      speechStatus.textContent = "Speech: Done ✅";

      try {
        await saveTranslation(user.id, null, "text", "speech", text);
      } catch (err) {
        console.error("⚠️ Failed to save text→speech translation:", err);
      }
    };
  });

  // =======================================
  // CLEAR INPUT
  // =======================================
  clearInputBtn.addEventListener("click", () => {
    inputText.value = "";
    gestureDisplay.innerHTML = `<p class="placeholder-text">Your translated gestures will appear here.</p>`;
    gestureStatus.textContent = "Cleared.";
    speechStatus.textContent = "";
  });
}

// =======================================
// SAVE TRANSLATION TO BACKEND
// =======================================
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
