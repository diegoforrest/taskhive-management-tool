-- Update existing projects table to use new status values
-- Run this AFTER updating your Entity definition and restarting the backend

USE taskhive_db;

-- First, add the new enum values temporarily
ALTER TABLE projects MODIFY COLUMN status ENUM('active', 'completed', 'on_hold', 'cancelled', 'In Progress', 'To Review', 'Completed') DEFAULT 'In Progress';

-- Update existing data to use new status values
UPDATE projects SET status = 'In Progress' WHERE status = 'active';
UPDATE projects SET status = 'To Review' WHERE status = 'on_hold';
UPDATE projects SET status = 'Completed' WHERE status = 'completed';
-- Note: 'cancelled' projects will be set to 'In Progress' as we don't have a cancelled status anymore
UPDATE projects SET status = 'In Progress' WHERE status = 'cancelled';

-- Finally, remove old enum values and keep only new ones
ALTER TABLE projects MODIFY COLUMN status ENUM('In Progress', 'To Review', 'Completed') DEFAULT 'In Progress';

-- Check the updated data
SELECT id, name, status, due_date FROM projects;
