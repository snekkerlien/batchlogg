# Batchlogg

Batchlogg is a brewing workspace for tracking batches, recipes, inventory, and brewing activity.

## Development

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

The app uses Next.js and Supabase. Configure the required environment variables in `.env.local` before running it locally.

## Analytics setup

Apply [`supabase/migrations/20261023210000_analytics_tracking.sql`](./supabase/migrations/20261023210000_analytics_tracking.sql), [`supabase/migrations/20261023220000_user_lifecycle_analytics.sql`](./supabase/migrations/20261023220000_user_lifecycle_analytics.sql), and [`supabase/migrations/20261023230000_page_section_analytics.sql`](./supabase/migrations/20261023230000_page_section_analytics.sql) to the Supabase database to enable aggregate traffic, first-batch conversion, and account-retention analytics. Page views are stored only as daily counts by top-level section.
