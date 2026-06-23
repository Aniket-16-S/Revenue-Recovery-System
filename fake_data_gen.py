from faker import Faker
import random
import psycopg2
from psycopg2.extras import execute_values

# ==========================================
# CONFIGURATION
# ==========================================

NUM_ROWS = 50          # Change this to any number
DB_NAME = "postgres"
DB_USER = "postgres"
DB_HOST = "localhost"

# ==========================================
# CONNECT
# ==========================================

conn = psycopg2.connect(
    host=DB_HOST,
    database=DB_NAME,
    user=DB_USER
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

print(f"Generating {NUM_ROWS:,} rows...")

for property_id in range(1, NUM_ROWS + 1):

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

cur.close()
conn.close()

print(f"Successfully inserted {NUM_ROWS:,} rows.")