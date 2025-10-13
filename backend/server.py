# ==============================
# server.py
# ==============================
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from db import create_user_table, register_user, get_connection
import os
import webbrowser
import threading

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

# Import model handler after app init
from model_handler import predict_sign

# Ensure table exists at server start
create_user_table()


# ==============================
# AI Prediction Route
# ==============================
@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json()
    image_data = data.get('image')

    if not image_data:
        return jsonify({"error": "No image provided"}), 400

    try:
        result = predict_sign(image_data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500


# ==============================
# API ROUTES
# ==============================
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'user')

    if not name or not email or not password:
        return jsonify({"message": "All fields are required"}), 400

    success = register_user(name, email, password, role)
    if success:
        return jsonify({"message": "User registered successfully"}), 200
    else:
        return jsonify({"message": "Email already exists"}), 409


@app.route('/api/login', methods=['POST'])
def login():
    from db import login_user  # Import here to avoid circular imports
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = login_user(email, password)
    if user:
        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user[0],
                "name": user[1],
                "email": user[2],
                "role": user[4]
            }
        }), 200
    else:
        return jsonify({"message": "Invalid email or password"}), 401


@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECTm id, name, email, role FROM users")
        users = cursor.fetchall()
        conn.close()

        user_list = [
            {"id": u[0], "name": u[1], "email": u[2], "role": u[3]}
            for u in users
        ]
        return jsonify(user_list), 200

    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


@app.route('/api/users/<int:user_id>/role', methods=['PUT'])
def update_user_role(user_id):
    try:
        data = request.get_json()
        new_role = data.get("role")

        if new_role not in ("admin", "user"):
            return jsonify({"error": "Invalid role"}), 400

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, user_id))
        conn.commit()
        conn.close()

        return jsonify({"message": "User role updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ==============================
# FRONTEND ROUTES
# ==============================
@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'login.html')


@app.route('/<path:path>')
def serve_static_files(path):
    return send_from_directory(app.static_folder, path)


# ==============================
# AUTO-OPEN FRONTEND ON START
# ==============================
def open_browser():
    webbrowser.open_new("http://127.0.0.1:5000/")


if __name__ == '__main__':
    # Only open the browser in the *main* process (not the reloader)
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        threading.Timer(1.5, open_browser).start()

    app.run(port=5000, debug=True)
