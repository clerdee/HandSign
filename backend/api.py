import db
from flask import Flask, request, jsonify
from flask_cors import CORS
import db  # This is your db.py with role support

app = Flask(__name__)
CORS(app)  # Allow calls from your frontend

# Ensure the user table exists
db.create_user_table()

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    # Allow role to be set, otherwise default to 'user'
    role = data.get("role", "user")
    if not name or not email or not password:
        return jsonify({"success": False, "message": "Missing fields"}), 400
    if db.register_user(name, email, password, role):
        return jsonify({"success": True, "message": "Registration successful"})
    else:
        return jsonify({"success": False, "message": "Email already registered"}), 409

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    user = db.validate_login(email, password)
    if user:
        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": {"id": user[0], "name": user[1], "role": user[2]}
        })
    else:
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

if __name__ == "__main__":
    app.run(debug=True)