-- Add roles column to users table if it doesn't already exist
-- This approach queries information_schema and only alters when missing.

SET @cnt = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'roles'
);

SET @sql = IF(@cnt = 0, 'ALTER TABLE `users` ADD COLUMN `roles` TEXT NULL', 'SELECT "roles column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure no NULLs for roles
UPDATE `users` SET `roles` = '[]' WHERE `roles` IS NULL;
