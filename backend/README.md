python 3.11
pip install tensorflow (v 2.14.0)
pip install mediapipe (v 0.10.14)

1. Collect hand signal data
python collectdata.py (captures frames from webcam, runs mediapipe detection, extracts landamarks and saves .npy files)
python data.py (training yata ito ng hand data)
python trainmodel.py
python app.py (testing sign languages)

2. How to start backend server & frontend
python server.py

3. Do you need .venv when you clone your repo on another laptop?
python -m venv .venv
.venv\Scripts\activate     # (on Windows)
pip install -r requirements.txt

4. python ai/ml
function.py
app.py

5. 

collectdata.py  →  saves raw images (Image/A, Image/B, …)
data.py         →  converts images into Mediapipe keypoints (MP_Data/A, MP_Data/B, …)
trainmodel.py   →  trains model on keypoints (model.h5 / model.keras)

6. git fetch origin
git pull origin main
git restore ""
