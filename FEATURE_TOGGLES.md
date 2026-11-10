# Feature rollout

Developers can manage the Business Account and Beer & Brewing Reviews toggles
at `/admin/feature-rollout`. Existing legacy `owner` accounts are treated as
developers. Administrators without the developer rank cannot use this page
or its API.

The toggles are stored in `feature_toggles`. The server verifies the user's
role before updating a toggle with the service-role client. Updates record
the user in `updated_by` and attempt to write an audit entry; the page warns
if the update succeeded but audit logging failed. Toggle reads are not cached
by the server.

Apply both `20261110214700_add_developer_feature_toggles.sql` and
`20261110220000_secure_feature_toggle_writes.sql` using the project's normal
Supabase migration workflow. The second migration removes direct client
write policies so that only the developer-checked server API can update
the toggles.

When a feature is disabled, its navigation links and related visible content
are hidden from non-developers. Disabled business pages return a generic
not-found response; rating achievements and notifications remain hidden until
reviews are enabled. Developer accounts retain access for testing.

The brewery API endpoints are not yet gated by the toggles. Hiding UI and
pages is not a security boundary: do not rely on these toggles as complete
API access control.
