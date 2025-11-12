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

        cursor.execute("UPDATE gestures SET gesture_name = ' ' WHERE id = 27;")

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

def create_user_demographics_table():
    """✅ Creates a table for user demographic data like age."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_demographics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            age INTEGER,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()

def create_feedback_table():
    """✅ Creates a table for user feedback and ratings."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()
# ============================
# REGISTER FUNCTION
# ============================
def register_user(name, email, age, password, role='user'):
    """
    ✅ Registers a new user and their age in a transaction.
    Inserts into 'users' and 'user_demographics' tables.
    """
    if role not in ('user', 'admin'):
        raise ValueError("Invalid role. Must be 'user' or 'admin'.")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        conn.execute('BEGIN')

        cursor.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            (name, email, password, role)
        )
        user_id = cursor.lastrowid

        if age:
            cursor.execute(
                'INSERT INTO user_demographics (user_id, age) VALUES (?, ?)',
                (user_id, age)
            )

        conn.commit()
        return True
        
    except sqlite3.IntegrityError:
        conn.rollback()
        return False
    except Exception as e:
        conn.rollback()
        print(f"❌ Error during registration transaction: {e}")
        return False
    finally:
        conn.close()

# ============================
# LOGIN FUNCTION
# ============================
def login_user(email, password):
    """
    ✅ Validate user login credentials.
    Returns user record from 'users' table only.
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
    """✅ Create a default admin and their age data if not present."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', ('admin@gmail.com',))
    admin_exists = cursor.fetchone()

    if not admin_exists:
        try:
            conn.execute('BEGIN')

            cursor.execute(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ('admin', 'admin@gmail.com', '123', 'admin')
            )
            user_id = cursor.lastrowid

            cursor.execute(
                'INSERT INTO user_demographics (user_id, age) VALUES (?, ?)',
                (user_id, 20) 
            )
            
            conn.commit()
            print("✅ Default admin account and age created (email: admin@gmail.com, password: 123)")
        except Exception as e:
            conn.rollback()
            print(f"❌ Error creating default admin: {e}")
    else:
        print("ℹ️ Default admin already exists.")

    conn.close()

# ============================
# Age Demohraphics 
# ============================
def get_age_by_user_id(user_id):
    """✅ Fetches a user's age from the demographics table."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT age FROM user_demographics WHERE user_id = ?", (user_id,))
    age_data = cursor.fetchone()
    conn.close()
    return age_data[0] if age_data else None

def get_all_ages():
    """✅ Fetches all user ages for the admin graph."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT age FROM user_demographics WHERE age IS NOT NULL")
    ages = cursor.fetchall()
    conn.close()
    return [age[0] for age in ages]

# ============================
# Feedback Management
# ============================
def submit_feedback(user_id, rating, comment):
    """✅ Inserts a new piece of feedback into the database."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO feedback (user_id, rating, comment) VALUES (?, ?, ?)',
            (user_id, rating, comment)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Error submitting feedback: {e}")
        conn.close()
        return False

def get_all_feedback_with_user_details():
    """✅ Fetches all feedback with user names/emails for the admin panel."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT f.id, u.name, u.email, f.rating, f.comment, f.created_at
        FROM feedback f
        JOIN users u ON f.user_id = u.id
        ORDER BY f.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    columns = [col[0] for col in cursor.description]
    feedback_list = [dict(zip(columns, row)) for row in rows]
    return feedback_list

# ============================
# INITIALIZE DATABASE
# ============================
if __name__ == "__main__":
    create_user_table()
    create_profile_pic_table()
    create_user_demographics_table()
    create_gestures_table()
    create_translations_table()
    create_feedback_table()
    ensure_default_admin()
    print(f"✅ Database ready at: {DB_PATH}")
