import os
import random
import psycopg2
from psycopg2.extras import execute_values
from faker import Faker
import hashlib

def hash_password(password: str) -> str:
    """Computes the SHA-256 hex digest of a password to match backend logic."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def get_connection():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        import urllib.parse
        # Convert postgresql+asyncpg to postgresql for psycopg2
        parsed = urllib.parse.urlparse(db_url.replace("postgresql+asyncpg", "postgresql"))
        return psycopg2.connect(
            database=parsed.path[1:],
            user=parsed.username,
            password=parsed.password,
            host=parsed.hostname,
            port=parsed.port or 5432
        )
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "postgres"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
        port=os.getenv("DB_PORT", "5432")
    )

SCHEMA_SQL = """
DO $$ BEGIN
    CREATE TYPE risk_level_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    state_id INTEGER NOT NULL REFERENCES states(id),
    UNIQUE(name, state_id)
);

CREATE TABLE IF NOT EXISTS ulbs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    district_id INTEGER NOT NULL REFERENCES districts(id),
    UNIQUE(name, district_id)
);

CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    name INTEGER NOT NULL,
    ulb_id INTEGER NOT NULL REFERENCES ulbs(id)
);

CREATE TABLE IF NOT EXISTS user_login (
    user_id VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS defaulters (
    property_id BIGINT NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    ward_id INTEGER NOT NULL REFERENCES wards(id),
    district_id INTEGER NOT NULL REFERENCES districts(id),
    property_type VARCHAR(50),
    annual_tax NUMERIC(14,2),
    arrears NUMERIC(14,2),
    penalty NUMERIC(14,2),
    interest NUMERIC(14,2),
    years_pending INTEGER,
    total_outstanding NUMERIC(14,2),
    risk_level risk_level_enum,
    PRIMARY KEY (property_id, district_id)
) PARTITION BY LIST (district_id);

CREATE TABLE IF NOT EXISTS defaulters_pune PARTITION OF defaulters FOR VALUES IN (1);
CREATE TABLE IF NOT EXISTS defaulters_mumbai PARTITION OF defaulters FOR VALUES IN (2);
CREATE TABLE IF NOT EXISTS defaulters_nashik PARTITION OF defaulters FOR VALUES IN (3);
CREATE TABLE IF NOT EXISTS defaulters_ratnagiri PARTITION OF defaulters FOR VALUES IN (4);

CREATE INDEX IF NOT EXISTS idx_ward_outstanding ON defaulters (ward_id, total_outstanding DESC);

CREATE OR REPLACE FUNCTION calculate_financials()
RETURNS trigger AS $func$
BEGIN
    NEW.total_outstanding := COALESCE(NEW.arrears, 0) + COALESCE(NEW.penalty, 0) + COALESCE(NEW.interest, 0);

    IF NEW.total_outstanding >= 100000 THEN
        NEW.risk_level := 'CRITICAL';
    ELSIF NEW.total_outstanding >= 50000 THEN
        NEW.risk_level := 'HIGH';
    ELSIF NEW.total_outstanding >= 10000 THEN
        NEW.risk_level := 'MEDIUM';
    ELSE
        NEW.risk_level := 'LOW';
    END IF;

    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_financials ON defaulters;
CREATE TRIGGER trg_calculate_financials
BEFORE INSERT OR UPDATE ON defaulters
FOR EACH ROW EXECUTE FUNCTION calculate_financials();

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ward_summary AS
SELECT
    w.id                                                              AS ward_id,
    w.name                                                            AS ward_number,
    u.name                                                            AS ulb_name,
    d.id                                                              AS district_id,
    d.name                                                            AS district_name,
    COUNT(*)                                                          AS total_defaulters,
    SUM(def.total_outstanding)                                        AS total_outstanding,
    ROUND(AVG(def.total_outstanding), 2)                              AS avg_outstanding,
    SUM(CASE WHEN def.risk_level::text = 'CRITICAL' THEN 1 ELSE 0 END)     AS critical_count,
    SUM(CASE WHEN def.risk_level::text = 'HIGH'     THEN 1 ELSE 0 END)     AS high_count,
    SUM(CASE WHEN def.risk_level::text = 'MEDIUM'   THEN 1 ELSE 0 END)     AS medium_count,
    SUM(CASE WHEN def.risk_level::text = 'LOW'      THEN 1 ELSE 0 END)     AS low_count
FROM   defaulters  def
JOIN   wards       w   ON w.id  = def.ward_id
JOIN   ulbs        u   ON u.id  = w.ulb_id
JOIN   districts   d   ON d.id  = def.district_id
GROUP  BY w.id, w.name, u.name, d.id, d.name
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS mv_ward_summary_ward_id_idx ON mv_ward_summary (ward_id);
CREATE INDEX IF NOT EXISTS mv_ward_summary_district_id_idx ON mv_ward_summary (district_id);
"""

def seed_static_data(cur):
    print("Seeding static data...")
    # State
    cur.execute("INSERT INTO states (id, name) VALUES (1, 'Maharashtra') ON CONFLICT DO NOTHING")
    
    # Districts
    districts = [(1, 'Pune'), (2, 'Mumbai'), (3, 'Nashik'), (4, 'Ratnagiri')]
    for d_id, d_name in districts:
        cur.execute("INSERT INTO districts (id, name, state_id) VALUES (%s, %s, 1) ON CONFLICT DO NOTHING", (d_id, d_name))
        
    # ULBs
    ulbs = [(1, 'PMC', 1), (2, 'BMC', 2), (3, 'NMC', 3), (4, 'RMC', 4)]
    for u_id, u_name, d_id in ulbs:
        cur.execute("INSERT INTO ulbs (id, name, district_id) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING", (u_id, u_name, d_id))
        
    # Wards (10 per ULB)
    ward_id = 1
    for u_id, _, _ in ulbs:
        for i in range(1, 11):
            cur.execute("INSERT INTO wards (id, name, ulb_id) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING", (ward_id, i, u_id))
            ward_id += 1

    # Users
    users = [
        ("admin", hash_password("admin")),
        ("ai_agent", hash_password("abcd_1234"))
    ]
    for uid, upwd in users:
        cur.execute("INSERT INTO user_login (user_id, password_hash) VALUES (%s, %s) ON CONFLICT DO NOTHING", (uid, upwd))

def generate_defaulters(cur):
    cur.execute("SELECT COUNT(*) FROM defaulters")
    if cur.fetchone()[0] > 0:
        print("Defaulters data already exists. Skipping generation.")
        return

    print("Generating 2000 defaulters (500 per district)...")
    fake = Faker()
    rows = []
    property_types = ["Residential", "Commercial", "Industrial"]
    
    property_id = 1
    # 4 districts, 10 wards each. Wards 1-10 -> District 1, etc.
    for district_id in range(1, 5):
        start_ward = (district_id - 1) * 10 + 1
        end_ward = start_ward + 9
        for _ in range(500):
            ward_id = random.randint(start_ward, end_ward)
            annual_tax = round(random.uniform(5000, 50000), 2)
            arrears = round(random.uniform(0, 150000), 2)
            penalty = round(random.uniform(0, 25000), 2)
            interest = round(random.uniform(0, 20000), 2)
            years_pending = random.randint(1, 10)
            
            rows.append((
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
            ))
            property_id += 1
            
    execute_values(
        cur,
        """
        INSERT INTO defaulters (
            property_id, owner_name, ward_id, district_id,
            property_type, annual_tax, arrears, penalty, interest, years_pending
        ) VALUES %s
        """,
        rows,
        page_size=1000
    )
    print(f"Successfully inserted {len(rows)} defaulters.")
    
    # Refresh Materialized View
    print("Refreshing materialized view...")
    cur.execute("REFRESH MATERIALIZED VIEW mv_ward_summary")

def main():
    try:
        conn = get_connection()
        conn.autocommit = False
        cur = conn.cursor()
        
        print("Setting up schema...")
        cur.execute(SCHEMA_SQL)
        
        seed_static_data(cur)
        generate_defaulters(cur)
        
        conn.commit()
        cur.close()
        conn.close()
        print("Database setup complete.")
    except Exception as e:
        print(f"Error setting up database: {e}")
        exit(1)

if __name__ == "__main__":
    main()