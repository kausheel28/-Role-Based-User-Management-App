-- Run these commands in your PostgreSQL client to set up the database

-- Create the database
CREATE DATABASE user_management;

-- If you want to use a specific user (optional)
-- CREATE USER app_user WITH PASSWORD 'your_password';
-- GRANT ALL PRIVILEGES ON DATABASE user_management TO app_user;

-- Connect to the user_management database and verify it's created
\c user_management;

-- Check if the connection works
SELECT 'Database setup successful!' as message;
