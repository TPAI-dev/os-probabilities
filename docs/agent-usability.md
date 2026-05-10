# LLM And Agent Usability

OS Probabilities should be friendly to agents by making every important contract explicit, machine-readable, and testable.

## Design Commitments

- Policies are data, not code.
- The JSON Schema is the public config contract.
- Validation errors include stable paths and direct messages.
- CLI commands emit JSON by default.
- Explain traces include exclusions, candidate weights, final odds, applied modifiers, rolls, and selected IDs.
- Real scenarios live under `examples/real-scenarios` and are runnable by CLI.
- `llms.txt` points agents to the most important files and commands.

## Agent Workflow

1. Read `llms.txt` and `docs/spec-v1.md`.
2. Validate the policy.
3. Run `explain` for one seed and context.
4. Run `simulate` for balancing impact.
5. If changing schema or runtime behavior, update tests and `docs/spec-v1.md`.
6. If changing practical behavior, update `examples/real-scenarios/lootbox-pity-event/scenario.yaml` or add a new scenario.
7. Run `npm run check`, `npm test`, `npm run test:python`, `npm run build`, and the relevant scenario.

## Golden Scenario

Run:

```bash
npm run build
npm run os-probabilities -- scenario examples/real-scenarios/lootbox-pity-event/scenario.yaml
```

This exercises a production-style lootbox open with event boosts, owned-item duplicate suppression, legendary pity, guardrail clamps, explanation traces, and simulation output.

## Cross-Runtime Fixtures

Run:

```bash
npm test -- packages/core/src/rng.test.ts
cargo test --workspace --locked
```

Both paths verify deterministic primitives against `fixtures/determinism/golden-vectors.json`.
