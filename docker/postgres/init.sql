-- PostgreSQL initialization script for Check Eat Backend
-- This script runs when the database container starts for the first time

-- Enable PostGIS extension and related modules
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

-- Set timezone to Asia/Seoul for Korean business operations
SET timezone = 'Asia/Seoul';

-- Grant privileges to postgres user
GRANT ALL PRIVILEGES ON DATABASE checkeat TO postgres;

-- Create indexes for better performance
-- These will be created after Prisma migrations run

-- Log successful initialization
SELECT 'Database initialized successfully with PostGIS support' as status;