# db.py
import sqlite3
import os

# ============================
# DATABASE SETUP
# ============================
DB_DIR = os.path.join(os.path.dirname(__file__), "database")
os.makedirs(DB_DIR, exist_ok=True)

DB_PATH = os.path.join(DB_DIR, "users.db")


def get_connection():
    return sqlite3.connect(DB_PATH)


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


# ============================
# REGISTER FUNCTION
# ============================
def register_user(name, email, password, role='user'):
    # ✅ Prevent invalid role values
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
        # Duplicate email or constraint issue
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
    ensure_default_admin()
    print(f"✅ Database ready at: {DB_PATH}")
