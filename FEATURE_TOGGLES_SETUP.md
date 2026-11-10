# Feature toggle setup

See [Feature rollout](./FEATURE_TOGGLES.md) for the developer-only controls,
required migrations, and current rollout limitations.

If the page cannot load or update toggles, check the server logs and confirm
that the feature-toggle migrations have been applied. If access is denied,
confirm that the signed-in account has the `developer` membership status
(legacy `owner` is also accepted).
