import sqlite3
import pandas as pd

# Connect to SQLite
conn = sqlite3.connect("rentalyzer.db")

# Set display options for wide console view
pd.set_option("display.max_columns", None)
pd.set_option("display.width", 1000)

print("\n" + "=" * 70)
print("[RENTALYZER DATABASE] DAFTAR TABEL DI RENTALYZER.DB")
print("=" * 70)

cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
tables = [row[0] for row in cursor.fetchall()]

for table in tables:
    print(f"\n--- TABEL: {table.upper()} ---")
    df = pd.read_sql_query(f"SELECT * FROM {table}", conn)
    if df.empty:
        print("   (Data masih kosong)")
    else:
        print(df.to_string(index=False))

conn.close()
print("\n" + "=" * 70)
