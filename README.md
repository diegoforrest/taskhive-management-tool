# TaskHive 

TaskHive is a clean, lightweight project and task manager that helps users work from idea to done without unnecessary complexity. Focus on what matters—priorities, progress, and quick reviews. 

Key features:

-User Authentication (Sign in/Sign up/Change Password)

-Create/Edit/Delete Project

-Create/Edit/Delete task within a project

-Drag and drop task (Todo,In progress, Done)

-Add feedback for each task within a project (Approve task/Change Requested/On Hold)

-Feedback history

-Approving Project that will go to completed section (once task status on review is approved)

-Completed Section changelog/feedback history

-Archived completed project that will go to draggable icon that can be see on dashboard

-Unarchived completed project inside the icon

Add ons feature:

-Can search any project using Project Titles/Due Dates (Topbar)

-Filter project by Date(All date, Today, This week, Behind Schedule, Specific date with calendar UI) and by Priority level (High, Medium, Low)

-Theme (Light mode, Dark Mode, System)

-Sidebar project dropdown

---

## Prerequisites

- Node.js (>= 18 recommended)
- npm
- MYSQL Db
- Tailwind
- Typescript

---

## Environment

Common backend env keys
- DATABASE_URL or DB_HOST / DB_PORT / DB_USER / DB_PASS / DB_NAME
- JWT_SECRET
- PORT

---

## Run locally

From the repo root you can run each service in its own terminal.

1. Backend (NestJS)
```bash
cd taskhive-backend
npm install
npm run start:dev
```

2. Frontend (Next.js)
```bash
cd taskhive
npm install
npm run dev
```


---

## Database & migrations

1. Ensure DB is reachable and `.env` DB settings are correct.
2. Run migrations thru bash or execute directly to the MYSQL workbench

taskhive-backend/scripts/run_migration.sh
---

## Incomplete functionality / known issues

- Forgot Password - Through Email authentication
SendGrid API is currently not used/connected. The backend attempts SendGrid when `SENDGRID_API_KEY` is present, but fallback logic (SMTP or returning/logging the reset link in development) is currently the primary path in many environments. Configure `SENDGRID_API_KEY` in `taskhive-backend/.env` and verify SendGrid deliverability to enable full email delivery. Tried testing the api it's not working due to api fallback. (incomplete)

- Caching system, Didn't add caching system on the deployed website that makes the deployed website will load a few seconds. Using CDN to run the website globally will make the website run smoothly probably will add this next time.


---
