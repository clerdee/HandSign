# model_handler.py
import cv2
import numpy as np
import mediapipe as mp
import base64
import io
from PIL import Image
from keras.models import model_from_json
from function import extract_keypoints, mediapipe_detection, actions

# ==============================
# Load model once at startup
# ==============================
print("🔹 Loading sign language model...")
with open("model.json", "r") as json_file:
    model = model_from_json(json_file.read())
model.load_weights("model.h5")
print("✅ Model loaded successfully!")

# Mediapipe setup
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    model_complexity=0,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Detection memory
sequence = []
predictions = []
sentence = []
threshold = 0.8

# ==============================
# Helper: decode base64 image
# ==============================
def decode_base64_image(base64_str):
    """Converts base64 image (from browser) to OpenCV frame."""
    try:
        base64_str = base64_str.split(",")[1]  # remove 'data:image/jpeg;base64,'
        image_data = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_data))
        frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        return frame
    except Exception as e:
        raise ValueError(f"Error decoding image: {e}")

# ==============================
# Main Prediction Function
# ==============================
def predict_sign(base64_image):
    global sequence, predictions, sentence

    frame = decode_base64_image(base64_image)
    image, results = mediapipe_detection(frame, hands)
    keypoints = extract_keypoints(results)
    sequence.append(keypoints)
    sequence = sequence[-50:]  # keep last 30 frames

    sign_output = "Processing..."
    confidence = 0.0

    if len(sequence) >= 1:
        try:
            res = model.predict(np.expand_dims(sequence, axis=0))[0]
            predictions.append(np.argmax(res))

            if res[np.argmax(res)] > threshold:
                predicted_action = actions[np.argmax(res)]
                confidence = float(res[np.argmax(res)])

                if len(sentence) == 0 or predicted_action != sentence[-1]:
                    sentence.append(predicted_action)

                sign_output = predicted_action

            if len(sentence) > 1:
                sentence = sentence[-1:]
        except Exception as e:
            print(f"⚠️ Prediction error: {e}")
            sign_output = "Error"

    return {
        "sign": sign_output,
        "confidence": round(confidence, 2)
    }
