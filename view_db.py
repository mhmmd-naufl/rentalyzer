import os
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rentalyzer.db")

engine = create_engine(DATABASE_URL)

pd.set_option("display.max_columns", None)
pd.set_option("display.width", 1000)

print("\n" + "=" * 70)
print("[RENTALYZER DATABASE] DAFTAR TABEL")
print("=" * 70)

with engine.connect() as conn:
    # Detect dialect
    dialect = engine.dialect.name

    if dialect == "sqlite":
        result = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        )
    else:
        # PostgreSQL / Supabase
        result = conn.execute(
            text("SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'")
        )

    tables = [row[0] for row in result.fetchall()]

for table in tables:
    print(f"\n--- TABEL: {table.upper()} ---")
    with engine.connect() as conn:
        df = pd.read_sql_query(f'SELECT * FROM "{table}"', conn)
    if df.empty:
        print("   (Data masih kosong)")
    else:
        # Truncate long image URLs for readability
        if "image" in df.columns:
            df["image"] = df["image"].str[:60] + "..."
        print(df.to_string(index=False))

print("\n" + "=" * 70)
