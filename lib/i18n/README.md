# Interface languages

Each language has one file in `locales`: `en.json` is the English source and
`nb.json` is Norwegian Bokmål. Keys are usually the original English interface
text; named keys such as `language.label` are used where necessary. Keep keys
and placeholders such as `{count}` identical in every file. Translate only
application-owned interface text, not user-submitted content.

To add interface text, add the same key and its translation to each locale file,
then use `t("English text")` in client components or `TranslatedText` for
static text in server components. Run the complete localization suite:

```powershell
node --experimental-strip-types --test "lib\i18n\*.test.mjs"
```

The tests check locale keys, placeholders, literal translation calls, Academy
content, dashboard messages, recipe types, profile achievement text, brewery
product categories, guide content and conditioning form text. They also check
registered API error translations across account, authentication, batch,
billing, brewing-profile, business, community, inventory, recipe, and shopping-list
flows. They cannot verify translation quality or replace live UI checks.

For API errors displayed to users, register application-owned error strings in
`apiErrors.ts` and translate their keys in every locale. Use `translateApiError`
at the display boundary; unknown errors remain visible for diagnosis. Avoid
translating arbitrary user content or assuming every server error is registered.
Recipe import also handles specific parameterized errors in `apiErrors.ts`;
preserve recipe names and CSV column identifiers.

To add a language:

1. Copy `locales/en.json` to a new locale file using its language tag and
   translate every value, retaining keys and placeholders.
2. Register the locale in `messages.ts` and its code, label key, availability
   and flag in `language.ts`; add the flag artwork to
   `LanguagePreferenceSelect.tsx`. Add the new language's label to every locale.
3. Add a database migration updating the `profiles.preferred_language`
   constraint to accept the new code. Deploy the migration before deploying code
   that reads or saves it.
4. Run the tests; they automatically check registered locales. Keep a language
   unavailable until its agreed interface coverage, dynamic messages, and
   persistence have been verified. After enabling a language, rerun the tests,
   type-check, production build, and language-switch/reload UI checks.

The current English lookup accepts an untranslated English source string for
existing pages that have not yet been migrated. Other languages throw on a
missing key rather than silently displaying English. Norwegian Bokmål is
currently enabled after locale coverage, dynamic error, persistence, build, and
live language-switch checks. Admin screens and user-generated text are outside
that translation scope.

Generated Academy math questions use named templates in the locale files and
interpolate their measurements at display time. Their English prompts remain
unchanged as the identifiers used by saved progress. Other Academy questions
use their original prompts as translation keys, including the fixed set of
generated Flavor & Aroma questions. Question sources are translated separately
while retaining the original source for link selection. Automated coverage
checks exercise the complete question pools and citations, but do not replace
review of translation quality or the rest of the interface.
