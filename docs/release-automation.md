# Release Automation

The release workflow is configured for npm trusted publishing through GitHub Actions OIDC. That is the preferred path because it avoids long-lived npm write tokens and enables npm provenance for public packages.

## npm Trusted Publisher Settings

Trusted publishing is configured for each package on npmjs.com:

- `@os-probabilities/core`
- `@os-probabilities/schema`
- `@os-probabilities/adapters`
- `@os-probabilities/cli`

Verified values:

- Provider: GitHub Actions
- GitHub owner: `TPAI-dev`
- Repository: `os-probabilities`
- Workflow filename: `release.yml`
- Environment: leave unset unless the workflow is later moved behind a GitHub environment

If the GitHub repository moves to a GitHub organization, update each trusted publisher owner value and every package `repository.url` before the next release.

## Release Flow

1. Update package versions and `CHANGELOG.md`.
2. Run local verification from `RELEASE.md`.
3. Commit the release changes.
4. Create and push a signed or annotated tag such as `v0.1.1`.
5. The `Release` workflow publishes npm packages from the tag.
6. Create the GitHub release after the workflow passes, or use the existing tag to draft release notes.

## Why No `NPM_TOKEN`

The workflow intentionally does not use `NODE_AUTH_TOKEN`. npm trusted publishing exchanges the GitHub OIDC token for short-lived publish credentials during `npm publish`. If trusted publishing is not configured in npm package settings, the workflow should fail rather than silently falling back to a long-lived token.

## Current v0.1.0 Note

`v0.1.0` was manually published after initial account and 2FA setup. Trusted publishing is now configured, so future versions should publish from GitHub Actions.
