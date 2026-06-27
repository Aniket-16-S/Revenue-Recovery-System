#!/bin/bash
set -e

echo "Starting database initialization (fake_data_gen.py)..."
# We run fake_data_gen.py, which creates the schema and populates the DB if needed.
python fake_data_gen.py
echo "Database initialization complete."

# Execute the main command (e.g. uvicorn app.main:app)
exec "$@"
