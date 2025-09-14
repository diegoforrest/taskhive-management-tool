Deploying this Nest backend to Vercel (serverless) - POC notes

Overview
--------
This document explains how to deploy the NestJS backend as a serverless function on Vercel (proof-of-concept). The handler uses `serverless-http` to wrap the Express adapter and caches the initialized Nest app to reduce cold-start cost.

Important prerequisites
----------------------
- Use a pooled DB connection (PgBouncer) or ensure the MySQL host supports many short-lived connections. Serverless functions create many parallel connections.
- Add the following environment variables in your Vercel project settings:
  - DATABASE_URL (or DB connection string)
  - JWT_SECRET
  - Any SMTP/third-party secrets (e.g., MAIL_HOST, MAIL_USER, etc.)

Build & Vercel settings
-----------------------
- The `vercel-build` script is configured to run `npm run build` which uses `nest build` to compile into `dist/`.
- On Vercel, create a new project and point to this repository. For the backend project, set:
  - Root Directory: `taskhive-backend`
  - Build Command: `npm run vercel-build`
  - Install Command: `npm install`
  - Output Directory: leave blank (serverless functions are used)

Serverless function mapping
---------------------------
Vercel will auto-detect functions under `taskhive-backend/dist` if compiled accordingly. You may need a `vercel.json` to map paths explicitly. Example mapping (root `vercel.json`):

{
  "functions": {
    "taskhive-backend/dist/serverless.handler.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}

Notes and caveats
-----------------
- This POC may require further tuning: increase memory/timeouts, and ensure DB connection pooling.
- Background jobs and WebSockets are not suitable for serverless; keep them on a serverful host.
- If you face connection exhaustion, use a managed connection pooler (PgBouncer for Postgres or Proxy for MySQL) or move DB operations to a serverful host.

Recommended path
-----------------
1. Try a POC deployment to Vercel with this handler. Monitor DB connection usage.
2. If DB pooling/costs are an issue, keep the backend on Render and deploy only the frontend to Vercel.
