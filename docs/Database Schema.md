# Database Schema: Revenue Recovery System

This document outlines the PostgreSQL database schema for the Revenue Recovery System.

## Tables

### `states`
Lookup table for geographical states.
- `id` (SERIAL, PRIMARY KEY)
- `name` (VARCHAR, UNIQUE)

### `districts`
Lookup table for districts, mapped to a state.
- `id` (SERIAL, PRIMARY KEY)
- `name` (VARCHAR)
- `state_id` (INTEGER, FOREIGN KEY to `states.id`)

### `ulbs`
Urban Local Bodies (ULBs), mapped to a district.
- `id` (SERIAL, PRIMARY KEY)
- `name` (VARCHAR)
- `district_id` (INTEGER, FOREIGN KEY to `districts.id`)

### `wards`
Wards within a ULB.
- `id` (SERIAL, PRIMARY KEY)
- `name` (INTEGER) - Typically represents the ward number
- `ulb_id` (INTEGER, FOREIGN KEY to `ulbs.id`)

### `user_login`
Stores user credentials for the application. Admin credentials may be hardcoded or dynamically populated.
- `user_id` (VARCHAR(255), PRIMARY KEY) - The username
- `password_hash` (VARCHAR(255)) - SHA-256 hashed password

### `defaulters` (Partitioned Table)
Stores property tax defaulters. Partitioned by `district_id` using LIST partitioning (e.g. Pune=1, Mumbai=2, Nashik=3, Ratnagiri=4).
- `property_id` (BIGINT) - Composite Primary Key
- `owner_name` (VARCHAR)
- `ward_id` (INTEGER, FOREIGN KEY to `wards.id`)
- `district_id` (INTEGER, FOREIGN KEY to `districts.id`) - Composite Primary Key
- `property_type` (VARCHAR)
- `annual_tax` (NUMERIC(14,2))
- `arrears` (NUMERIC(14,2))
- `penalty` (NUMERIC(14,2))
- `interest` (NUMERIC(14,2))
- `years_pending` (INTEGER)
- `total_outstanding` (NUMERIC(14,2))
- `risk_level` (ENUM: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')

## Views

### `mv_ward_summary` (Materialized View)
A materialized view that pre-aggregates the `defaulters` table at the ward level to optimize dashboard and API reads.
- `ward_id`: Ward ID
- `ward_number`: Name/Number of the ward
- `ulb_name`: Name of the ULB
- `district_id`: District ID
- `district_name`: District Name
- `total_defaulters`: Count of defaulters in the ward
- `total_outstanding`: Sum of all outstanding dues
- `avg_outstanding`: Average dues per defaulter
- `critical_count`: Defaulters with CRITICAL risk level
- `high_count`: Defaulters with HIGH risk level
- `medium_count`: Defaulters with MEDIUM risk level
- `low_count`: Defaulters with LOW risk level

*Note: This view is refreshed concurrently on read operations to keep dashboard metrics up-to-date.*

## Triggers

### `trg_calculate_financials`
Fires **BEFORE INSERT OR UPDATE** on the `defaulters` table.
Executes the `calculate_financials()` function to dynamically compute values before saving them to the table.

**Function Logic (`calculate_financials`):**
1. Sets `total_outstanding` = `arrears` + `penalty` + `interest`.
2. Sets `risk_level` based on the computed `total_outstanding`:
   - `>= 100,000`: `CRITICAL`
   - `>= 50,000`: `HIGH`
   - `>= 10,000`: `MEDIUM`
   - `< 10,000`: `LOW`
