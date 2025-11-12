# server.py
import cv2
import numpy as np
import mediapipe as mp
import pickle
import base64
import os
import subprocess
import sqlite3 

from flask import Flask, request, jsonify, send_from_directory 
from werkzeug.utils import secure_filename
from flask_cors import CORS
from db import (
    create_user_table,
    create_profile_pic_table,
    create_gestures_table,
    ensure_default_admin,
    register_user,
    login_user,
    get_connection,
    update_labels_dict,
    create_user_demographics_table,
    get_age_by_user_id,  
    get_all_ages,
    create_feedback_table, 
    submit_feedback,               
    get_all_feedback_with_user_details        
)

labels_dict = update_labels_dict()
print("✅ Database initialized and labels loaded:", labels_dict)

model_dict = pickle.load(open('./model.p', 'rb'))
model = model_dict['model']

mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

# ==============================
# APP CONFIG
# ==============================
app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

def allowed_file(filename):
    """✅ Validate file extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

DATA_DIR = './data'

def get_next_folder():
    """Find next available numeric folder for gesture."""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    existing = [int(f) for f in os.listdir(DATA_DIR) if f.isdigit()]
    return str(max(existing) + 1) if existing else "0"

# ==============================
# INITIALIZE DATABASE
# ==============================
create_user_table()
create_profile_pic_table()
create_user_demographics_table()
create_gestures_table()
create_feedback_table()
ensure_default_admin()
print("✅ Database initialized and ready.")

# ==============================
# AUTH ROUTES
# ==============================
@app.route('/api/register', methods=['POST'])
def register():
    """✅ Handles registration."""
    name = request.form.get('name')
    email = request.form.get('email')
    age = request.form.get('age')  # <-- ADDED
    password = request.form.get('password')
    role = request.form.get('role', 'user')
    file = request.files.get('profilePic')

    if not name or not email or not password or not age: # <-- ADDED 'not age'
        return jsonify({"message": "All fields are required"}), 400

    try:
        age_int = int(age) # <-- ADDED
        if age_int <= 0:
             return jsonify({"message": "Age must be a positive number"}), 400
    except ValueError:
        return jsonify({"message": "Age must be a valid number"}), 400

    success = register_user(name, email, age_int, password, role) # <-- ADDED 'age_int'
    if not success:
        return jsonify({"message": "Email already exists"}), 409

    if file and allowed_file(file.filename):
        filename = f"{email.replace('@', '_').replace('.', '_')}_{file.filename}"
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM users WHERE email = ?", (email,)
        )
        user = cursor.fetchone()
        if user:
            cursor.execute(
                "INSERT OR REPLACE INTO profile_pictures (user_id, image_path) VALUES (?, ?)",
                (user[0], f"/uploads/{filename}")
            )
            conn.commit()
        conn.close()

    return jsonify({"message": "User registered successfully"}), 200

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = login_user(email, password)
    
    if user:
        age = get_age_by_user_id(user[0])
        
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT image_path FROM profile_pictures WHERE user_id = ?", (user[0],))
        pic = cursor.fetchone()
        conn.close()

        profilePic = f"http://127.0.0.1:5000{pic[0]}" if pic else None

        if user[4] == 'admin':
            redirect_page = 'admin-dashboard.html'
        else:
            redirect_page = 'user-dashboard.html'

        return jsonify({
            "message": "Login successful",
            "redirect": redirect_page,
            "user": {
                "id": user[0],
                "name": user[1],
                "email": user[2],
                "age": age,     
                "role": user[4],      
                "profilePic": profilePic
            }
        }), 200
    else:
        return jsonify({"message": "Invalid email or password"}), 401

# ==============================
# UPLOAD PROFILE PICTURE
# ==============================
@app.route('/api/upload-profile-picture', methods=['POST'])
def upload_profile_picture():
    if "profilePic" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["profilePic"]
    user_id = request.form.get("user_id")

    if not user_id:
        return jsonify({"error": "Missing user ID"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config["UPLOAD_FOLDER"], f"user_{user_id}_{filename}")
        file.save(save_path)

        image_url = f"/uploads/{os.path.basename(save_path)}"

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO profile_pictures (user_id, image_path)
            VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET image_path = excluded.image_path
        """, (user_id, image_url))
        conn.commit()
        conn.close()

        return jsonify({
            "message": "Profile picture uploaded successfully!",
            "image_url": f"http://127.0.0.1:5000{image_url}"
        }), 200

    return jsonify({"error": "Invalid file type"}), 400

# ==============================
# GESTURE MANAGEMENT ROUTES
# ==============================
@app.route('/api/collect_images', methods=['POST'])
def collect_images():
    """✅ Handles collecting images for a new gesture and auto-updates labels_dict."""
    global labels_dict 

    try:
        data = request.get_json()
        gesture_name = data.get('gesture_name')
        gesture_label = data.get('gesture_label')
        description = data.get('description')
        created_by = data.get('created_by')

        if not gesture_name or not gesture_label:
            return jsonify({'error': 'Missing required fields'}), 400

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO gestures (gesture_name, gesture_label, description, created_by)
            VALUES (?, ?, ?, ?)
        ''', (gesture_name, gesture_label, description, created_by))
        conn.commit()
        conn.close()

        labels_dict = update_labels_dict()
        print("✅ labels_dict updated:", labels_dict)

        next_folder = get_next_folder()

        try:
            process = subprocess.Popen(
                ['python', 'collect_imgs.py', gesture_name, gesture_label],
                creationflags=subprocess.CREATE_NEW_CONSOLE  
            )
            print(f"📸 Started image collection for '{gesture_name}' (PID: {process.pid})")
        except Exception as e:
            print(f"❌ Failed to start subprocess: {str(e)}")
            return jsonify({'error': f'Failed to start camera: {str(e)}'}), 500

        return jsonify({
            'message': f"Started collecting images for '{gesture_name}' and labels_dict updated!",
            'folder': next_folder
        }), 200

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/train_model', methods=['POST'])
def train_model():
    """✅ Handles creating dataset and training model."""
    global model

    try:
        subprocess.run(['python', 'create_dataset.py'], check=True)
        subprocess.run(['python', 'train_classifier.py'], check=True)
        
        model_dict = pickle.load(open('./model.p', 'rb'))
        model = model_dict['model']

        return jsonify({
            'message': 'Dataset created and model trained successfully!'
        }), 200
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ==============================
# AI PREDICTION ROUTE
# ==============================
@app.route('/api/predict', methods=['POST'])
def predict():
    """✅ Receives a base64-encoded image and returns predicted sign + confidence."""
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400

        image_data = data['image'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        with mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5) as hands:
            results = hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if not results.multi_hand_landmarks:
                return jsonify({'sign': None, 'confidence': 0.0})

            for hand_landmarks in results.multi_hand_landmarks:
                x_ = []
                y_ = []
                for lm in hand_landmarks.landmark:
                    x_.append(lm.x)
                    y_.append(lm.y)

                data_aux = []
                for lm in hand_landmarks.landmark:
                    data_aux.append(lm.x - min(x_))
                    data_aux.append(lm.y - min(y_))

                features = np.asarray(data_aux)
                prediction = model.predict([np.asarray(data_aux)])
                confidence = np.max(model.predict_proba([np.asarray(data_aux)]))

                predicted_index = int(prediction[0])
                predicted_sign = labels_dict.get(predicted_index, "?")
                print(f"Predicted index: {predicted_index}, Labels dict: {labels_dict}")

                return jsonify({
                    'sign': predicted_sign,
                    'confidence': float(confidence)
                }), 200

        return jsonify({'sign': None, 'confidence': 0.0})
    except Exception as e:
        print("Prediction error:", e)
        return jsonify({'error': str(e)}), 500

# ==============================
# TEXT TO GESTURE
# ==============================
@app.route('/api/text-to-gesture', methods=['POST'])
def text_to_gesture():
    text = request.json.get('text', '').upper()
    gestures = []

    gesture_folder = os.path.join(os.path.dirname(__file__), "static", "gesture")

    for char in text:
        if char == ' ':
            path = os.path.join(gesture_folder, "space.jpg")
            if os.path.exists(path):
                gestures.append(f"http://127.0.0.1:5000/static/gesture/space.jpg")
        elif 'A' <= char <= 'Z':
            path = os.path.join(gesture_folder, f"{char}.png")
            if os.path.exists(path):
                gestures.append(f"http://127.0.0.1:5000/static/gesture/{char}.png")

    return jsonify({'gestures': gestures})

# ==============================
# SERVE UPLOADS
# ==============================
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """✅ Serve uploaded profile pictures."""
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

# ==============================
# UPDATE PROFILE ROUTE
# ==============================
@app.route('/api/update-profile/<int:user_id>', methods=['POST'])
def update_profile(user_id):
    """✅ Update user info and optionally profile picture."""
    conn = get_connection()
    cursor = conn.cursor()

    name = request.form.get("name")
    email = request.form.get("email")
    password = request.form.get("password")
    file = request.files.get("profilePic")

    if not name or not email:
        return jsonify({"message": "Name and email are required"}), 400

    cursor.execute("SELECT id FROM users WHERE email = ? AND id != ?", (email, user_id))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return jsonify({"message": "Email is already in use"}), 409

    if password:
        cursor.execute(
            "UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?",
            (name, email, password, user_id)
        )
    else:
        cursor.execute(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            (name, email, user_id)
        )
    conn.commit()

    profilePicUrl = None
    if file and allowed_file(file.filename):
        filename = f"user_{user_id}_{file.filename}"
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)
        profilePicUrl = f"/uploads/{filename}"

        cursor.execute("""
            INSERT INTO profile_pictures (user_id, image_path)
            VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET image_path = excluded.image_path
        """, (user_id, profilePicUrl))
        conn.commit()

    conn.close()

    return jsonify({
        "message": "Profile updated successfully",
        "profilePic": f"http://127.0.0.1:5000{profilePicUrl}" if profilePicUrl else None
    }), 200

# ==============================
# GET USERS (for Admin DataTable)
# ==============================
@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id, name, email, role FROM users")
        rows = cursor.fetchall()

        users = []
        for r in rows:
            users.append({
                "id": r[0],
                "name": r[1],
                "email": r[2],
                "role": r[3]
            })

        return jsonify(users), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ==============================
# UPDATE USER ROLE
# ==============================
@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user_role(user_id):
    try:
        data = request.get_json()
        new_role = data.get('role')

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, user_id))
        conn.commit()

        return jsonify({"message": "Role updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ==============================
# SAVE TRANSLATION
# ==============================
@app.route('/api/save-translation', methods=['POST'])
def save_translation():
    """
    ✅ Saves a translation record into the database.
    Looks up gesture_id automatically if input_type == 'gesture'
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        gesture_id = data.get('gesture_id')  
        input_type = data.get('input_type')
        output_type = data.get('output_type')
        translated_text = data.get('translated_text')

        if not user_id or not input_type or not output_type:
            return jsonify({"error": "Missing required fields"}), 400

        conn = get_connection()
        cursor = conn.cursor()

        if gesture_id is None and input_type == "gesture" and translated_text:
            last_letter = translated_text[-1].upper()

            if gesture_id is None and input_type == "gesture" and translated_text:
                last_letter = translated_text[-1].upper()
                cursor.execute("SELECT id FROM gestures WHERE UPPER(gesture_name) = ?", (last_letter,))
                row = cursor.fetchone()
                if row:
                    gesture_id = row[0]

                row = cursor.fetchone()
                if row:
                    gesture_id = row[0]

        cursor.execute("""
            INSERT INTO translations (user_id, gesture_id, input_type, output_type, translated_text)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, gesture_id, input_type, output_type, translated_text))
        conn.commit()
        conn.close()

        return jsonify({"message": "Translation saved successfully"}), 200

    except Exception as e:
        print("❌ Error saving translation:", e)
        return jsonify({"error": str(e)}), 500

# ==============================
# FETCH TRANSLATIONS DATATABLE
# ==============================
@app.route('/api/translations', methods=['GET'])
def get_translations():
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT t.id, t.user_id, g.gesture_name, 
               t.input_type, t.output_type, 
               t.translated_text, t.created_at
        FROM translations t
        LEFT JOIN gestures g ON t.gesture_id = g.id
        ORDER BY t.id DESC
    """
    cursor.execute(query)
    rows = cursor.fetchall()

    columns = [col[0] for col in cursor.description]
    result = [dict(zip(columns, row)) for row in rows]

    conn.close()
    return jsonify(result)

# ==============================
# DASHBOARD STATISTICS ROUTES
# ==============================
# TRANSLATIONS PER USER
@app.route("/api/translations_per_user", methods=["GET"])
def translations_per_user():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT u.name AS user_name, COUNT(t.id) AS count
            FROM users u
            LEFT JOIN translations t ON u.id = t.user_id
            GROUP BY u.id
            ORDER BY count DESC
        """)
        results = [{"user_name": row[0], "count": row[1]} for row in cursor.fetchall()]

        conn.close()
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# INPUT TYPE USAGE
@app.route("/api/input_type_usage", methods=["GET"])
def input_type_usage():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT input_type, COUNT(*) AS count
            FROM translations
            GROUP BY input_type
        """)
        results = [{"input_type": row[0], "count": row[1]} for row in cursor.fetchall()]

        conn.close()
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# OUTPUT TYPE USAGE
@app.route("/api/output_type_usage", methods=["GET"])
def output_type_usage():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT output_type, COUNT(*) AS count
            FROM translations
            GROUP BY output_type
        """)
        results = [{"output_type": row[0], "count": row[1]} for row in cursor.fetchall()]

        conn.close()
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# TRANSLATIONS PER DAY
@app.route('/api/translations_per_day', methods=['GET'])
def get_translations_per_day():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                DATE(created_at) AS date,
                COUNT(*) AS count
            FROM translations
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC
        """)
        rows = cursor.fetchall()
        conn.close()

        data = [{"date": row[0], "count": row[1]} for row in rows]
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# USERS COUNT BY ROLE
@app.route('/api/users_count_roles', methods=['GET'])
def get_users_count_roles():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT role, COUNT(*) FROM users GROUP BY role")
        rows = cursor.fetchall()
        conn.close()

        counts = {"user_count": 0, "admin_count": 0}
        for role, count in rows:
            if role == "user":
                counts["user_count"] = count
            elif role == "admin":
                counts["admin_count"] = count

        return jsonify(counts)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# AGE DEMOHRAPHICS DATA
@app.route('/api/admin/age_data', methods=['GET'])
def get_age_data():
    """✅ Endpoint for the admin age graph."""
    all_ages = get_all_ages()

    age_groups = {
        "1-10": 0,
        "11-18": 0,
        "19-25": 0,
        "26-35": 0,
        "36-50": 0,
        "51+": 0
    }
    for age in all_ages:
        if not age: 
            continue 
        if age <= 10: age_groups["1-10"] += 1
        elif age <= 18: age_groups["11-18"] += 1
        elif age <= 25: age_groups["19-25"] += 1
        elif age <= 35: age_groups["26-35"] += 1
        elif age <= 50: age_groups["36-50"] += 1
        else: age_groups["51+"] += 1

    return jsonify(age_groups), 200

#  ==============================
# FETCH GESTURES (for DataTables)
# ==============================
@app.route('/api/gestures', methods=['GET'])
def get_gestures():
    """✅ Returns all gestures for DataTables."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                id, 
                gesture_name, 
                gesture_label, 
                description, 
                created_by, 
                created_at
            FROM gestures
            ORDER BY id DESC
        """)
        rows = cursor.fetchall()

        gestures = []
        for r in rows:
            gestures.append({
                "id": r[0],
                "gesture_name": r[1],
                "gesture_label": r[2],
                "description": r[3],
                "created_by": r[4],
                "created_at": r[5],
            })

        return jsonify(gestures), 200

    except Exception as e:
        print("❌ Error fetching gestures:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ==============================
# FEEDBACK ROUTES
# ==============================
@app.route('/api/feedback', methods=['POST'])
def handle_feedback():
    """✅ Handles submission of user feedback."""
    data = request.json
    user_id = data.get('user_id')
    rating = data.get('rating')
    comment = data.get('comment')

    if not user_id or not rating:
        return jsonify({"message": "User ID and rating are required"}), 400

    success = submit_feedback(user_id, rating, comment)
    if success:
        return jsonify({"message": "Feedback submitted successfully"}), 200
    else:
        return jsonify({"message": "Failed to submit feedback"}), 500

@app.route('/api/admin/feedback', methods=['GET'])
def get_all_feedback():
    """✅ Fetches all feedback for the admin panel. (Add admin auth!)"""
    # TODO: Add authentication to ensure only admins can access this!
    feedback = get_all_feedback_with_user_details()
    return jsonify(feedback), 200

# ==============================
# SERVE STATIC GESTURE
# ==============================
@app.route('/static/gesture/<path:filename>')
def serve_gesture(filename):
    gesture_folder = os.path.join(os.path.dirname(__file__), "static", "gesture")
    return send_from_directory(gesture_folder, filename)

# ==============================
# FRONTEND ROUTE (OPTIONAL)
# ==============================
@app.route('/')
def serve_index():
    """✅ Serve the frontend index page."""
    return app.send_static_file('handsign.html')

# ==============================
# RUN SERVER
# ==============================
if __name__ == '__main__':
    app.run(debug=True)
