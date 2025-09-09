-- Drop existing tables to avoid foreign key constraints
USE taskhive_db;

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS change_logs;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Create users table with user_id as primary key
CREATE TABLE users (
    user_id BIGINT NOT NULL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255) NULL,
    password VARCHAR(255) NOT NULL,
    firstName VARCHAR(255) NULL,
    lastName VARCHAR(255) NULL,
    isActive TINYINT NOT NULL DEFAULT 1,
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
    createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    user_id BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
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
    assigned_user_id BIGINT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_user_id) REFERENCES users(user_id) ON DELETE SET NULL
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
    user_id BIGINT NOT NULL,
    project_id INT NULL,
    task_id INT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Insert a test user to verify the structure
INSERT INTO users (user_id, email, username, password, firstName, lastName, isActive) 
VALUES (12345, 'test@example.com', 'testuser', '$2b$10$hashedpassword', 'Test', 'User', 1);

-- Show the table structure
DESCRIBE users;
