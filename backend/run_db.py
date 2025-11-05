import sqlite3

conn = sqlite3.connect('./database/handsign.db')
cursor = conn.cursor()

# cursor.execute("DELETE FROM gestures WHERE id = 28")
# cursor.execute("UPDATE sqlite_sequence SET seq = 27 WHERE name = 'gestures'")
# cursor.execute("UPDATE gestures SET gesture_name = ' ' WHERE id = 27;")

conn.commit()
conn.close()

print("PAKICHECK KUNG TAMA")
