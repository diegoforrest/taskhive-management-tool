# TaskHive — Backend

This repository contains the TaskHive backend service — a NestJS + TypeORM API that implements authentication, project/task management.

## Table of contents
- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Database & migrations](#database--migrations)
- [Running the app](#running-the-app)
- [Troubleshooting](#troubleshooting)

## Features

- JWT-based authentication (register / login)
- Password reset via provider (SendGrid) or SMTP; fallback to logged reset links in development
- Project and task CRUD operations
- Change logs for task/project updates
- TypeORM entities for MySQL-compatible backends

## Tech stack

- Node.js (LTS)
- NestJS
- TypeScript
- TypeORM
- MySQL / MariaDB (or compatible)

## Prerequisites

- Node.js (recommended LTS) and npm installed
- A MySQL-compatible database available
- (Optional) SendGrid API key or SMTP credentials to send emails

## Quick start

1. Install dependencies

```
npm install
```

2. Create a `.env` file in the repository root (see required variables below).

3. Prepare the database (see the Database & migrations section).

4. Run in development mode

```
npm run start:dev
```

After the dev server starts, the API will be available on the configured `PORT` (default: 3001 or the value in your `.env`).

## Environment variables

```
# App
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=replace-me-with-a-strong-secret

# Database (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=myuser
DB_PASS=mypassword
DB_NAME=taskhive

# Frontend URL used to build password reset links
FRONTEND_URL=http://localhost:3000

## Database & migrations

 -Open MySQL workbench execute the Migration.sql
 -Double check tables and columns

## Running the app

- Development (watch + auto-reload):

```
npm run start:dev
```

- Build (production bundle):

```
npm run build
```

- Run production build (after `npm run build`):

```
npm run start:prod
```

## Troubleshooting

- Error: database connection refused or authentication failed
  - Verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, and that the DB server is reachable.

- Error: missing env variable at startup
- Ensure `.env` contains the required settings and restart the app. (Local)
- For Deployed make sure that the Env setup is correct and include the CA

- Email not sending
  - Confirm SendGrid key or SMTP settings. If neither are configured the app will log the reset link (in dev) or return it in the API when `DEV_EXPOSE_RESET_LINK` is enabled.

If you encounter a runtime error, please check startup logs for stack traces and the line number reported by Nest.

## Useful files

- `src/` — application source
- `src/logger.ts` — centralized logger wrapper
- `migration.sql` — schema/migration SQL
