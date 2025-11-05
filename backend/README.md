1. Check versions
python --version
pip list

2. install packages
pip freeze > requirements.txt
pip install opencv-python==4.7.0.68 mediapipe==0.10.14 scikit-learn==1.2.0

pip install numpy==1.23.5 matches with scikit-learn==1.2.0
pip install scikit-learn==1.2.0

pip install flask flask-cors
verify
pip show flask
pip show flask-cors

3. new computer install
pip install -r requirements.txt

3. activate when using (venv)
venv\Scripts\activate
deactivate

4. flow
collect_imgs.py = capture raw images
create_dataset.py = turn raw images into training data, creates/saves in data.pickle
train_classifier.py = trains a machine learning model, loads data.pickle
inference_classifier.py = detects a hand, extracts landmarks, and uses model.p to predict the letter shown

5. routes
/api/translations_per_day → Line chart

/api/users_count_roles → Pie chart (admin vs user)

/api/translations_per_user → User usage chart

/api/input_type_usage → Input type usage chart

/api/output_type_usage → Output type usage chart