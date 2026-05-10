# Contributing

OS Probabilities is intentionally small. Changes should preserve deterministic behavior, clear validation, and a dependency-free core package.

## Development

```bash
npm install
npm run check
npm test
npm run build
```

## Standards

- Keep public behavior versioned through `schemaVersion`.
- Add or update tests for every runtime behavior change.
- Do not use host-language random APIs for decision execution.
- Do not add runtime dependencies to `@os-probabilities/core`.
- Prefer explicit schema changes over implicit config behavior.

## Pull Requests

Include:

- The behavior or schema change.
- Tests that cover the change.
- Any compatibility impact for existing configs.
