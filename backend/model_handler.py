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

# Mediapipe setup (tuned for better accuracy)
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    model_complexity=1,              # higher accuracy vs. speed
    min_detection_confidence=0.6,    # reduce false detections
    min_tracking_confidence=0.6      # improve tracking stability
)

# Detection memory
sequence = []
predictions = []
sentence = []

# Prediction and smoothing parameters
threshold = 0.85              # min softmax confidence for top-1
margin_threshold = 0.12       # top1 - top2 margin
smoothing_window = 8          # number of recent frames to consider
stability_ratio = 0.7         # fraction of window that must agree
min_sequence_for_inference = 20  # don't infer until we have this many frames

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

    # Only append when a hand is detected to avoid noisy zeros
    if results and getattr(results, 'multi_hand_landmarks', None):
        keypoints = extract_keypoints(results)
        sequence.append(keypoints)
        # keep only last 50 frames (model was trained on 50)
        sequence = sequence[-50:]
    else:
        # No hand detected – clear short-term vote history
        predictions = []

    sign_output = "Processing..."
    confidence = 0.0

    # Only infer when we have enough temporal context
    if len(sequence) >= min_sequence_for_inference:
        try:
            # Use last up to 50 frames to match training distribution
            input_seq = np.expand_dims(sequence, axis=0)
            res = model.predict(input_seq, verbose=0)[0]

            top_idx = int(np.argmax(res))
            top_prob = float(res[top_idx])
            # Get second best probability
            if len(res) > 1:
                second_prob = float(np.partition(res, -2)[-2])
            else:
                second_prob = 0.0

            # Update recent predictions window
            predictions.append(top_idx)
            predictions[:] = predictions[-smoothing_window:]

            # Compute stability in the voting window
            from collections import Counter
            if predictions:
                counts = Counter(predictions)
                most_common_idx, most_common_count = counts.most_common(1)[0]
            else:
                most_common_idx, most_common_count = top_idx, 0

            required_count = max(1, int(np.ceil(stability_ratio * max(1, len(predictions)))))

            is_confident = (top_prob >= threshold) and ((top_prob - second_prob) >= margin_threshold)
            is_stable_vote = (most_common_idx == top_idx) and (most_common_count >= required_count)

            if is_confident and is_stable_vote:
                predicted_action = actions[top_idx]
                confidence = round(top_prob, 2)

                if len(sentence) == 0 or predicted_action != sentence[-1]:
                    sentence.append(predicted_action)

                sign_output = predicted_action

            # Keep only the most recent finalized sign in sentence
            if len(sentence) > 1:
                sentence = sentence[-1:]
        except Exception as e:
            print(f"⚠️ Prediction error: {e}")
            sign_output = "Error"

    return {
        "sign": sign_output,
        "confidence": round(confidence, 2)
    }
