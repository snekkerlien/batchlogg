# Batchlogg

Batchlogg is a brewing workspace for tracking batches, refining recipes, managing inventory, and connecting with other brewers. It runs as a Next.js web app (with an optional Tauri desktop shell) and uses Supabase for auth and data.

## Getting started

1. Copy environment variables into `.env.local` (at minimum `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
2. Install and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run tauri:dev` | Desktop app (Tauri) in development |

## Deploy

The web app is typically deployed on Vercel. Configure the same public Supabase variables (and any billing/service keys your environment needs) in the host's environment settings.
