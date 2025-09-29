-- Full schema migration for TaskHive
-- This script creates the required tables and relationships used by the
-- backend entities. It is safe to run against an existing database: it
-- drops the listed tables (if present) and recreates them.

-- NOTE: remove or edit the DROP statements if you don't want destructive
-- behavior. Run in a maintenance window for production databases.

-- Disable foreign key checks for safe drop/create order
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables in reverse dependency order (safe to run multiple times)
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS change_logs;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

-- Re-enable foreign key checks after drops
SET FOREIGN_KEY_CHECKS = 1;

-- Create users table
CREATE TABLE users (
    user_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255) NULL,
    password VARCHAR(255) NOT NULL,
    firstName VARCHAR(255) NULL,
    lastName VARCHAR(255) NULL,
    -- roles stored as JSON text (e.g. '["user"]')
    roles TEXT NULL,
    isActive TINYINT(1) NOT NULL DEFAULT 1,
    createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX IDX_user_email (email)
);

-- Create projects table
CREATE TABLE projects (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
    status ENUM('In Progress', 'To Review', 'Completed') NOT NULL DEFAULT 'In Progress',
    due_date DATE NULL,
    progress INT NOT NULL DEFAULT 0,
    archived TINYINT(1) NOT NULL DEFAULT 0,
    archived_at DATETIME(6) NULL,
    createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    user_id INT NOT NULL,
    INDEX IDX_projects_user_id (user_id),
    CONSTRAINT FK_projects_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create tasks table
CREATE TABLE tasks (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contents TEXT NULL,
    type ENUM('task', 'project') NOT NULL DEFAULT 'task',
    status ENUM('Todo', 'In Progress', 'Done') NOT NULL DEFAULT 'Todo',
    priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
    due_date DATE NULL,
    assignee VARCHAR(255) NULL,
    progress INT NOT NULL DEFAULT 0,
    createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    project_id INT NOT NULL,
    assigned_user_id INT NULL,
    INDEX IDX_tasks_project_id (project_id),
    INDEX IDX_tasks_assigned_user_id (assigned_user_id),
    CONSTRAINT FK_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT FK_tasks_assigned_user FOREIGN KEY (assigned_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Create change_logs table
CREATE TABLE change_logs (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    description TEXT NOT NULL,
    old_status VARCHAR(255) NULL,
    new_status VARCHAR(255) NULL,
    remark TEXT NULL,
    createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    user_id INT NOT NULL,
    project_id INT NULL,
    task_id INT NULL,
    INDEX IDX_changelogs_user_id (user_id),
    INDEX IDX_changelogs_project_id (project_id),
    INDEX IDX_changelogs_task_id (task_id),
    CONSTRAINT FK_changelogs_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_changelogs_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT FK_changelogs_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Create refresh_tokens table (matches RefreshToken entity)
-- Note: entity has both `user_id` column and a ManyToOne relation which may
-- result in an additional join column named `userUserId`. We'll create both
-- to match TypeORM's behavior and avoid insert-time errors.
CREATE TABLE refresh_tokens (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    userUserId INT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NULL,
    revoked TINYINT(1) NOT NULL DEFAULT 0,
    createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX IDX_refresh_tokens_user_id (user_id),
    INDEX IDX_refresh_tokens_userUserId (userUserId),
    CONSTRAINT FK_refresh_tokens_userUserId FOREIGN KEY (userUserId) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create password_reset_tokens table (matches PasswordResetToken entity)
CREATE TABLE password_reset_tokens (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    userUserId INT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) NOT NULL DEFAULT 0,
    createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX IDX_password_reset_user_id (user_id),
    INDEX IDX_password_reset_userUserId (userUserId),
    CONSTRAINT FK_password_reset_userUserId FOREIGN KEY (userUserId) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Optional: seed default role value for existing users
UPDATE users SET roles = '["user"]' WHERE roles IS NULL;

-- Show the table structure for verification
DESCRIBE users;

