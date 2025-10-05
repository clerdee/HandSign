import sqlite3
import os

# Make sure the database folder exists
DB_DIR = os.path.join(os.path.dirname(__file__), "database")
os.makedirs(DB_DIR, exist_ok=True)

DB_PATH = os.path.join(DB_DIR, "users.db")

def get_connection():
    return sqlite3.connect(DB_PATH)

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

def register_user(name, email, password, role='user'):
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

def validate_login(email, password):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, name, role FROM users WHERE email = ? AND password = ?',
        (email, password)
    )
    result = cursor.fetchone()
    conn.close()
    return result  # None if not found, else (id, name, role)

if __name__ == "__main__":
    create_user_table()
    print(f"Database created at: {DB_PATH}")