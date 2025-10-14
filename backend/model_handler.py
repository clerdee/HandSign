# model_handler.py
import cv2
import numpy as np
import mediapipe as mp
import base64
import io
import os
import threading
from PIL import Image, UnidentifiedImageError
from keras.models import model_from_json
from function import extract_keypoints, mediapipe_detection, actions
from collections import deque

# ==============================
# Load model once at startup
# ==============================
print("🔹 Loading sign language model...")
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_JSON_PATH = os.path.join(_BASE_DIR, "model.json")
_MODEL_WEIGHTS_PATH = os.path.join(_BASE_DIR, "model.h5")

if not os.path.exists(_MODEL_JSON_PATH):
    raise FileNotFoundError(f"model.json not found at {_MODEL_JSON_PATH}")

with open(_MODEL_JSON_PATH, "r") as json_file:
    model = model_from_json(json_file.read())

if not os.path.exists(_MODEL_WEIGHTS_PATH):
    # Surface a clear message; training/export may be required.
    raise FileNotFoundError(
        f"model.h5 not found at {_MODEL_WEIGHTS_PATH}. Ensure weights are exported next to model.json."
    )

model.load_weights(_MODEL_WEIGHTS_PATH)
print("✅ Model loaded successfully!")

# Mediapipe setup (tuned for better accuracy)
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    model_complexity=0,              # 0 for speed, 1 for accuracy; we'll auto-switch
    min_detection_confidence=0.6,    # reduce false detections
    min_tracking_confidence=0.6      # improve tracking stability
)

# Detection memory
sequence_by_session = {}
predictions_by_session = {}
sentence_by_session = {}
last_access_by_session = {}
_calls_since_cleanup = 0

# Prediction and smoothing parameters
threshold = 0.8               # slightly lower to avoid missing good preds
margin_threshold = 0.10       # relax margin for sensitivity
smoothing_window = 10         # larger window for stability
stability_ratio = 0.7         # fraction of window that must agree
min_sequence_for_inference = 24  # modest temporal context

# Downscale factor to reduce CPU cost when extracting landmarks
DOWNSCALE_WIDTH = 320

# Thread safety for Mediapipe + model inference
_inference_lock = threading.Lock()

# ==============================
# Helper: decode base64 image
# ==============================
def decode_base64_image(base64_str):
    """Converts base64 image (from browser) to OpenCV BGR frame.
    Tries PIL first; falls back to OpenCV if needed.
    """
    try:
        header, b64 = base64_str.split(",", 1)
    except ValueError:
        b64 = base64_str
        header = ""

    image_data = base64.b64decode(b64)
    # First try PIL (usually fastest)
    try:
        image = Image.open(io.BytesIO(image_data))
        frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        return frame
    except (UnidentifiedImageError, OSError):
        pass

    # Fallback: use OpenCV decoding
    np_bytes = np.frombuffer(image_data, dtype=np.uint8)
    frame = cv2.imdecode(np_bytes, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Unable to decode image data; ensure WebP/JPEG support is installed.")
    return frame

# ==============================
# Main Prediction Function
# ==============================
def _get_session_buffers(session_id):
    if session_id not in sequence_by_session:
        sequence_by_session[session_id] = deque(maxlen=50)
        predictions_by_session[session_id] = deque(maxlen=smoothing_window)
        sentence_by_session[session_id] = deque(maxlen=1)
    last_access_by_session[session_id] = int(cv2.getTickCount())
    return sequence_by_session[session_id], predictions_by_session[session_id], sentence_by_session[session_id]


def _maybe_cleanup_sessions(max_age_seconds: int = 1800):
    global _calls_since_cleanup
    _calls_since_cleanup += 1
    if _calls_since_cleanup % 100 != 0:
        return

    now_ticks = cv2.getTickCount()
    freq = cv2.getTickFrequency()
    expired = []
    for sid, last in list(last_access_by_session.items()):
        age_sec = (now_ticks - last) / freq
        if age_sec > max_age_seconds:
            expired.append(sid)
    for sid in expired:
        sequence_by_session.pop(sid, None)
        predictions_by_session.pop(sid, None)
        sentence_by_session.pop(sid, None)
        last_access_by_session.pop(sid, None)


def predict_sign(base64_image, session_id="default"):
    seq_buf, pred_buf, sent_buf = _get_session_buffers(session_id)
    _maybe_cleanup_sessions()

    frame = decode_base64_image(base64_image)

    # Optional downscale for faster landmark detection
    h, w = frame.shape[:2]
    scale = DOWNSCALE_WIDTH / float(w) if w > DOWNSCALE_WIDTH else 1.0
    if scale < 1.0:
        frame_small = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    else:
        frame_small = frame

    # Wrap mediapipe + prediction in a lock for thread safety
    with _inference_lock:
        image, results = mediapipe_detection(frame_small, hands)

    # Only append when a hand is detected to avoid noisy zeros
    if results and getattr(results, 'multi_hand_landmarks', None):
        keypoints = extract_keypoints(results)
        seq_buf.append(keypoints)
    else:
        # No hand detected – clear short-term vote history
        pred_buf.clear()

    sign_output = "Processing..."
    confidence = 0.0

    # Only infer when we have enough temporal context
    if len(seq_buf) >= min_sequence_for_inference:
        try:
            # Use last up to 50 frames to match training distribution
            input_seq = np.expand_dims(np.array(list(seq_buf)), axis=0)
            res = model.predict(input_seq, verbose=0)[0]

            top_idx = int(np.argmax(res))
            top_prob = float(res[top_idx])
            # Get second best probability
            if len(res) > 1:
                second_prob = float(np.partition(res, -2)[-2])
            else:
                second_prob = 0.0

            # Update recent predictions window
            pred_buf.append(top_idx)

            # Compute stability in the voting window
            from collections import Counter
            if pred_buf:
                counts = Counter(list(pred_buf))
                most_common_idx, most_common_count = counts.most_common(1)[0]
            else:
                most_common_idx, most_common_count = top_idx, 0

            required_count = max(1, int(np.ceil(stability_ratio * max(1, len(pred_buf)))))

            is_confident = (top_prob >= threshold) and ((top_prob - second_prob) >= margin_threshold)
            is_stable_vote = (most_common_idx == top_idx) and (most_common_count >= required_count)

            if is_confident and is_stable_vote:
                predicted_action = actions[top_idx]
                confidence = round(top_prob, 2)

                if len(sent_buf) == 0 or predicted_action != sent_buf[-1]:
                    sent_buf.append(predicted_action)

                sign_output = predicted_action

            # Keep only the most recent finalized sign in sentence
            if len(sent_buf) > 1:
                # deque maxlen=1 already caps, but keep logic explicit
                while len(sent_buf) > 1:
                    sent_buf.popleft()
        except Exception as e:
            print(f"⚠️ Prediction error: {e}")
            sign_output = "Error"

    return {
        "sign": sign_output,
        "confidence": round(confidence, 2)
    }
