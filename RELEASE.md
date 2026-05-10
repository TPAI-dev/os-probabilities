# Release Checklist

This repo is release-ready. GitHub branch protection, Pages, npm package publication, and npm trusted publishing are configured.

## Verify

```bash
npm ci
npm run check
npm test
npm run test:python
npm run build
npm run playground:build
npm run docs:api
npm run smoke:install
npm run benchmark -- --write benchmarks/latest.json
npm run pack:dry
cargo test --workspace --locked
cargo build -p os-probabilities-wasm --target wasm32-unknown-unknown --locked
```

## GitHub Repo

```bash
gh auth login -h github.com --web --git-protocol https --scopes repo
gh repo create TPAI-dev/os-probabilities --public --description "Define random decisions once. Validate, simulate, explain, and run them anywhere." --source . --remote origin
```

The repo is configured for GitHub Pages through `.github/workflows/pages.yml`.

## Publish npm Packages

Preferred path: publish through GitHub Actions trusted publishing so npm provenance works correctly and no long-lived npm write token is required.

1. Confirm npm trusted publishers still point to owner `TPAI-dev`, repo `os-probabilities`, and workflow `release.yml`.
2. Push a `v*` tag.
3. The release workflow verifies and publishes these public workspaces:
   - `@os-probabilities/core`
   - `@os-probabilities/schema`
   - `@os-probabilities/adapters`
   - `@os-probabilities/cli`

Manual local fallback should be rare because it will not get GitHub Actions provenance unless npm supports the local environment. Use it only for emergency patching and document the reason in release notes.

```bash
npm adduser
npm run publish:packages -- --provenance=false
```

See [docs/release-automation.md](docs/release-automation.md).

