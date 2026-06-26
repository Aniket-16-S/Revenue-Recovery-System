from faker import Faker
import random
import psycopg2
from psycopg2.extras import execute_values
import csv
import os

def export_defaulters_to_csv(conn, filepath="temp/defaulters.csv"):
    """
    Fetches the entire defaulters table from the database and writes it to a CSV file.
    Creates the destination directory if it doesn't exist.
    """
    dir_name = os.path.dirname(filepath)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)

    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM defaulters ORDER BY property_id ASC")
        rows = cur.fetchall()
        colnames = [desc[0] for desc in cur.description]

        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(colnames)
            writer.writerows(rows)

        print(f"Successfully exported {len(rows)} records to {filepath}")
    except Exception as e:
        print(f"Error exporting database to CSV: {e}")
    finally:
        cur.close()

# ==========================================
# CONFIGURATION
# ==========================================

NUM_ROWS = 500        # Change this to any number
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_PORT = os.getenv("DB_PORT", "5432")

# ==========================================
# CONNECT
# ==========================================

conn = psycopg2.connect(
    host=DB_HOST,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD,
    port=DB_PORT
)

cur = conn.cursor()

fake = Faker()

# ------------------------------------------
# ward_id -> district_id mapping
# ward IDs 1-10 = Pune
# ward IDs 11-20 = Mumbai
# ------------------------------------------

ward_to_district = {
    1: 1,
    2: 1,
    3: 1,
    4: 1,
    5: 1,
    6: 1,
    7: 1,
    8: 1,
    9: 1,
    10: 1,

    11: 2,
    12: 2,
    13: 2,
    14: 2,
    15: 2,
    16: 2,
    17: 2,
    18: 2,
    19: 2,
    20: 2
}

property_types = [
    "Residential",
    "Commercial",
    "Industrial"
]

rows = []

# Fetch current maximum property_id from the database to avoid duplicates
cur.execute("SELECT COALESCE(MAX(property_id), 0) FROM defaulters")
start_id = cur.fetchone()[0] + 1

print(f"Generating {NUM_ROWS:,} rows starting from property_id {start_id}...")

for i in range(NUM_ROWS):
    property_id = start_id + i

    ward_id = random.randint(1, 20)
    district_id = ward_to_district[ward_id]

    annual_tax = round(random.uniform(5000, 50000), 2)

    arrears = round(random.uniform(0, 150000), 2)
    penalty = round(random.uniform(0, 25000), 2)
    interest = round(random.uniform(0, 20000), 2)

    years_pending = random.randint(1, 10)

    rows.append(
        (
            property_id,
            fake.name(),
            ward_id,
            district_id,
            random.choice(property_types),
            annual_tax,
            arrears,
            penalty,
            interest,
            years_pending
        )
    )

print("Inserting rows into PostgreSQL...")

execute_values(
    cur,
    """
    INSERT INTO defaulters (
        property_id,
        owner_name,
        ward_id,
        district_id,
        property_type,
        annual_tax,
        arrears,
        penalty,
        interest,
        years_pending
    )
    VALUES %s
    """,
    rows,
    page_size=1000
)

conn.commit()

# Export entire database as a CSV file to temp/defaulters.csv
export_defaulters_to_csv(conn)

cur.close()
conn.close()

print(f"Successfully inserted {NUM_ROWS:,} rows.")