# Release Checklist

This repo is release-ready once GitHub and npm auth are configured.

## Verify

```bash
npm ci
npm run check
npm test
npm run test:python
npm run build
npm run playground:build
npm run benchmark -- --write benchmarks/latest.json
npm run pack:dry
npm run publish:dry
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

Preferred path: publish through GitHub Actions so npm provenance works correctly.

1. Add an npm automation token as the repository secret `NPM_TOKEN`.
2. Push a `v*` tag.
3. Publish a GitHub release for that tag.
4. The release workflow publishes these public workspaces:
   - `@os-probabilities/core`
   - `@os-probabilities/schema`
   - `@os-probabilities/adapters`
   - `@os-probabilities/cli`

Manual local fallback:

```bash
npm adduser
npm run publish:packages
```

If provenance fails locally, publish from GitHub Actions instead of disabling provenance.

