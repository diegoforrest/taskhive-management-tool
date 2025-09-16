# TaskHive — Frontend

This is the TaskHive frontend application built with Next.js and TypeScript.

## Table of contents
- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [Build & deployment notes](#build--deployment-notes)
- [Testing & linting](#testing--linting)
- [Useful files & structure](#useful-files--structure)
- [Getting Started](#Getting-Started)

## Features

- Modern React UI using Next.js 15 and React 19
- Theme support, responsive layout, and accessible components
- Authentication flows and protected routes
- Project and task boards, Kanban-like interactions

## Tech stack

- Next.js (15.x)
- React 19
- TypeScript
- Tailwind CSS
- Radix UI primitives

## Prerequisites

- Node.js (LTS), npm

## Quick start

1. Install dependencies

```
npm install
```

2. Run the dev server

```
npm run dev
```

3. Build for production

```
npm run build
```

4. Start production server (after build)

```
npm run start
```

## Environment variables

The frontend expects a few environment values for API endpoints and behavior. Add them to a `.env.local` file at the repository root when needed.

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

## Available scripts

- `npm run dev` — run Next.js in development mode
- `npm run build` — build the production bundle


## Testing & linting

```
npm run build
```


## Useful files & structure

- `src/` — application code (app routes, components, lib)
- `next.config.ts` — Next.js configuration
- `package.json` — scripts and dependency manifest

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open (http://localhost:3000) with your browser to see the result.
