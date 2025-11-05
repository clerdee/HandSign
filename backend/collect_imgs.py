# collect_imgs.py
import os
import cv2
import sys

DATA_DIR = './data'
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

gesture_name = sys.argv[1] if len(sys.argv) > 1 else "unknown"
gesture_label = sys.argv[2] if len(sys.argv) > 2 else "N/A"

existing_folders = [int(f) for f in os.listdir(DATA_DIR) if f.isdigit()]
if existing_folders:
    start_class = max(existing_folders) + 1
else:
    start_class = 0 

number_of_new_classes = 1  
dataset_size = 100      

cap = cv2.VideoCapture(0)

for j in range(start_class, start_class + number_of_new_classes):
    class_dir = os.path.join(DATA_DIR, str(j))
    if not os.path.exists(class_dir):
        os.makedirs(class_dir)

    print(f"Collecting data for class {j}: {gesture_name} ({gesture_label})")

    while True:
        ret, frame = cap.read()
        cv2.putText(frame, f"Gesture: {gesture_name} | Press 'Q' to start", (20, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.imshow('frame', frame)
        if cv2.waitKey(25) == ord('q'):
            break

    counter = 0
    while counter < dataset_size:
        ret, frame = cap.read()
        if not ret:
            continue
        cv2.imshow('frame', frame)
        cv2.waitKey(25)
        cv2.imwrite(os.path.join(class_dir, f'{counter}.jpg'), frame)
        counter += 1

cap.release()
cv2.destroyAllWindows()
print(f"✅ Finished collecting {dataset_size} images for {gesture_name}.")
