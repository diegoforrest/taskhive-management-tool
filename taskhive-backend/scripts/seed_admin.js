/*
Simple seed script to ensure an admin user exists.
- Loads DB config from environment (.env)
- Adds admin user if not present, using bcrypt for password hashing

Usage from project root (PowerShell):
  cd D:\taskhive-management-tool\taskhive-backend
  node scripts\seed_admin.js

This script uses mysql2 and bcryptjs which are already project dependencies.
*/

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function main() {
  // refuse to run in production
  if (process.env.NODE_ENV === 'production') {
    console.error('[seed] Refusing to run in production environment');
    process.exit(1);
  }
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'taskhive_db';

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
  });
  try {
    console.log('[seed] connected to DB');

    // ensure roles column exists (defensive) using information_schema check
    const [colRows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'roles'",
      [database],
    );
    const cnt = colRows && colRows[0] ? colRows[0].cnt : 0;
    if (cnt === 0) {
      await conn.execute('ALTER TABLE `users` ADD COLUMN `roles` TEXT NULL');
    }
    await conn.execute(
      "UPDATE `users` SET `roles` = '[]' WHERE `roles` IS NULL",
    );

    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'adminpass';

    const [rows] = await conn.execute(
      'SELECT user_id FROM users WHERE email = ?',
      [adminEmail],
    );
    if (rows.length > 0) {
      console.log('[seed] admin user already exists, skipping insert');
      return;
    }

    const hashed = await bcrypt.hash(adminPassword, 10);
    const rolesJson = JSON.stringify(['admin']);

    const [result] = await conn.execute(
      'INSERT INTO users (email, username, password, firstName, lastName, isActive, roles) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [adminEmail, 'admin', hashed, 'Admin', 'User', 1, rolesJson],
    );

    console.log('[seed] admin user created with id', result.insertId);
    console.log('[seed] admin credentials:', {
      email: adminEmail,
      password: adminPassword,
    });
  } catch (err) {
    console.error('[seed] error', err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
