# Batchlogg

Batchlogg is a brewing workspace for tracking batches, recipes, inventory, and brewing activity.

## Development

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

The app uses Next.js and Supabase. Configure the required environment variables in `.env.local` before running it locally.

## Localization

English and Norwegian Bokmål are available in the interface. Whenever a change
adds or edits user-facing text, update the English source and every available
translation in `lib/i18n/locales/` in the same change. This includes headings,
buttons, labels, placeholders, accessibility text, loading and empty states,
success messages, validation, and errors.

- Use `t("English text")` in client components and
  `<TranslatedText text="English text" />` for static text in server components.
- Keep translation keys and placeholders such as `{count}` consistent across
  locales. If you change an English source string used as a key, update its
  translations and usages too.
- Translate what users see, not the values the app stores or sends. Keep IDs,
  enum values, form values, and saved question identifiers stable; translate
  only their display labels.
- Add app-owned API errors to `lib/i18n/apiErrors.ts` and translate them at the
  UI boundary. Use a localized fallback for network or invalid-response errors;
  preserve unknown server diagnostics instead of hiding them.
- Do not translate user-submitted content (such as recipe names, notes, or
  messages) or admin-only screens.
- Run the localization tests before finishing:

  ```powershell
  node --experimental-strip-types --test "lib\i18n\*.test.mjs"
  ```

The tests catch missing locale keys and mismatched placeholders. For the full
translation workflow and guidance on adding another language, see
[`lib/i18n/README.md`](./lib/i18n/README.md).

## Analytics setup

Apply [`supabase/migrations/20261023210000_analytics_tracking.sql`](./supabase/migrations/20261023210000_analytics_tracking.sql), [`supabase/migrations/20261023220000_user_lifecycle_analytics.sql`](./supabase/migrations/20261023220000_user_lifecycle_analytics.sql), and [`supabase/migrations/20261023230000_page_section_analytics.sql`](./supabase/migrations/20261023230000_page_section_analytics.sql) to the Supabase database to enable aggregate traffic, first-batch conversion, and account-retention analytics. Page views are stored only as daily counts by top-level section.
