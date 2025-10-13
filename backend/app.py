# app.py
from function import *
from keras.utils import to_categorical
from keras.models import model_from_json
from keras.layers import LSTM, Dense
from keras.callbacks import TensorBoard
json_file = open("model.json", "r")
model_json = json_file.read()
json_file.close()
model = model_from_json(model_json)
model.load_weights("model.h5")
def prob_viz(res, actions, input_frame, colors,threshold):
    output_frame = input_frame.copy()
    for num, prob in enumerate(res):
        cv2.rectangle(output_frame, (0,60+num*40), (int(prob*100), 90+num*40), colors[num], -1)
        cv2.putText(output_frame, actions[num], (0, 85+num*40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2, cv2.LINE_AA)
        
    return output_frame


# 1. Detection state and smoothing parameters
sequence = []
sentence = []
accuracy = []
predictions = []

# Prediction and smoothing parameters (aligned with server handler)
threshold = 0.85              # min softmax confidence for top-1
margin_threshold = 0.12       # top1 - top2 margin
smoothing_window = 8          # number of recent frames to consider
stability_ratio = 0.7         # fraction of window that must agree
min_sequence_for_inference = 20  # don't infer until we have this many frames

cap = cv2.VideoCapture(0)
print("Camera opened:", cap.isOpened())
# Set mediapipe model (higher accuracy + stability)
with mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    model_complexity=1,
    min_detection_confidence=0.6,
    min_tracking_confidence=0.6) as hands:
    while cap.isOpened():

        # Read feed
        ret, frame = cap.read()

        # Make detections (use ROI, show it on the full frame)
        cropframe = frame[40:400, 0:300]
        frame = cv2.rectangle(frame, (0, 40), (300, 400), 255, 2)
        image, results = mediapipe_detection(cropframe, hands)

        # Append only when a hand is detected to avoid noisy zeros
        if results and getattr(results, 'multi_hand_landmarks', None):
            keypoints = extract_keypoints(results)
            sequence.append(keypoints)
            sequence = sequence[-50:]
        else:
            # No hand detected – clear short-term vote history
            predictions = []

        try:
            # Only infer when we have enough temporal context
            if len(sequence) >= min_sequence_for_inference:
                input_seq = np.expand_dims(sequence, axis=0)
                res = model.predict(input_seq, verbose=0)[0]

                top_idx = int(np.argmax(res))
                top_prob = float(res[top_idx])
                second_prob = float(np.partition(res, -2)[-2]) if len(res) > 1 else 0.0

                # Update recent predictions window
                predictions.append(top_idx)
                predictions = predictions[-smoothing_window:]

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
                    if len(sentence) == 0 or predicted_action != sentence[-1]:
                        sentence.append(predicted_action)
                        accuracy.append(f"{int(round(top_prob*100))}%")

                # Keep only the most recent finalized sign
                if len(sentence) > 1:
                    sentence = sentence[-1:]
                    accuracy = accuracy[-1:]
        except Exception:
            pass
            
        cv2.rectangle(frame, (0,0), (300, 40), (245, 117, 16), -1)
        cv2.putText(frame,"Output: "+' '.join(sentence)+''.join(accuracy), (3,30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA)

        # Show to screen
        cv2.imshow('OpenCV Feed', frame)

        # Break gracefully
        if cv2.waitKey(10) & 0xFF == ord('q'):
            break
    cap.release()
    cv2.destroyAllWindows()