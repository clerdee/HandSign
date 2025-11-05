# db.py
import sqlite3
import os

# ============================
# DATABASE SETUP
# ============================
DB_DIR = os.path.join(os.path.dirname(__file__), "database")
os.makedirs(DB_DIR, exist_ok=True)

DB_PATH = os.path.join(DB_DIR, "handsign.db")


def get_connection():
    return sqlite3.connect(DB_PATH)

# ============================
# LABELS DICTIONARY MANAGEMENT
# ============================
def update_labels_dict():
    """
    ✅ Fetches all gestures from the database and returns an updated labels_dict.
    Matches backend (inference_classifier.py) index starting from 1.
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, gesture_name FROM gestures ORDER BY id ASC")
        gestures = cursor.fetchall()
        conn.close()

        labels_dict = {}
        for i, (gesture_id, gesture_name) in enumerate(gestures, start=1):  
            labels_dict[i] = gesture_name

        print("✅ labels_dict refreshed from database:", labels_dict)
        return labels_dict

    except Exception as e:
        print(f"❌ Error updating labels_dict: {e}")
        return {}

# ============================
# TABLE CREATION
# ============================
def create_user_table():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
        )
    ''')
    conn.commit()
    conn.close()

def create_profile_pic_table():
    """✅ Creates a separate table for user profile pictures."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS profile_pictures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            image_path TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    conn.commit()
    conn.close()

def create_gestures_table():
    """✅ Creates gestures table with A–Z letters and 'Space' gesture."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS gestures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gesture_name TEXT NOT NULL,
            gesture_label TEXT NOT NULL,
            description TEXT,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ''')

    cursor.execute("SELECT COUNT(*) FROM gestures")
    count = cursor.fetchone()[0]

    if count == 0:
        gestures = [
            (chr(i), 'Letter', f'Hand sign representing the letter {chr(i)} in Filipino Sign Language', 1)
            for i in range(ord('A'), ord('Z') + 1)
        ]

        gestures.append((
            'Space', 'Special', 'Hand sign representing a space or word separator', 1
        ))

        cursor.executemany('''
            INSERT INTO gestures (gesture_name, gesture_label, description, created_by)
            VALUES (?, ?, ?, ?)
        ''', gestures)

        print("✅ Gestures A–Z + Space inserted successfully.")
    else:
        print("ℹ️ Gestures table already populated.")

    conn.commit()
    conn.close()

def create_translations_table():
    """✅ Table to record all translations made by users."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS translations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            gesture_id INTEGER,
            input_type TEXT NOT NULL,       -- e.g. 'text', 'gesture', or 'speech'
            output_type TEXT NOT NULL,      -- e.g. 'text' or 'speech'
            translated_text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (gesture_id) REFERENCES gestures(id)
        )
    ''')
    conn.commit()
    conn.close()
# ============================
# REGISTER FUNCTION
# ============================
def register_user(name, email, password, role='user'):
    if role not in ('user', 'admin'):
        raise ValueError("Invalid role. Must be 'user' or 'admin'.")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            (name, email, password, role)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

# ============================
# LOGIN FUNCTION
# ============================
def login_user(email, password):
    """
    ✅ Validate user login credentials.
    Returns full user record if found, else None.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, name, email, password, role FROM users WHERE email = ? AND password = ?',
        (email, password)
    )
    user = cursor.fetchone()
    conn.close()
    return user

# ============================
# DEFAULT ADMIN CREATION
# ============================
def ensure_default_admin():
    """✅ Create a default admin if it doesn't exist."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', ('admin@gmail.com',))
    admin_exists = cursor.fetchone()

    if not admin_exists:
        cursor.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            ('admin', 'admin@gmail.com', '123', 'admin')
        )
        conn.commit()
        print("✅ Default admin account created (email: admin@gmail.com, password: 123)")
    else:
        print("ℹ️ Default admin already exists.")

    conn.close()

# ============================
# INITIALIZE DATABASE
# ============================
if __name__ == "__main__":
    create_user_table()
    create_profile_pic_table()
    ensure_default_admin()
    create_gestures_table()
    create_translations_table()
    print(f"✅ Database ready at: {DB_PATH}")
