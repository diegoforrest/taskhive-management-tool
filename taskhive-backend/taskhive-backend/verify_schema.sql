-- After running the main migration, use these queries to verify the setup:

-- Check if users table has the correct structure
DESCRIBE users;

-- Check foreign key relationships
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    REFERENCED_TABLE_SCHEMA = 'taskhive_db'
    AND TABLE_SCHEMA = 'taskhive_db';

-- Test inserting a user with user_id as primary key
INSERT INTO users (user_id, email, username, password, firstName, lastName, isActive) 
VALUES (12345, 'test@example.com', 'testuser', '$2b$10$samplehash', 'John', 'Doe', 1);

-- Verify the user was inserted
SELECT * FROM users WHERE user_id = 12345;
