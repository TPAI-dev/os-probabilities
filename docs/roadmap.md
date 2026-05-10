# Roadmap Tracks

## TypeScript Runtime

Status: implemented for V1 with validation, execution, explanation, simulation, adapters, and CLI.

## Python Balancing Tools

Status: implemented as JSON simulation analysis utilities under `tools/python`.

Commands:

```bash
npm run test:python
PYTHONPATH=tools/python python3 -m os_probabilities_balancer summarize <simulation.json>
PYTHONPATH=tools/python python3 -m os_probabilities_balancer compare <baseline.json> <candidate.json>
```

## Rust/WASM Deterministic Core

Status: source added under `crates` and locally verified with rustup-managed Rust plus `wasm32-unknown-unknown`.

Commands once Rust is installed:

```bash
cargo test --workspace --locked
cargo build -p os-probabilities-wasm --target wasm32-unknown-unknown --locked
```

## Policy Primitives

Status: V1 primitives include `multiply`, `add`, `pity`, `set`, `clamp`, and `drop`.

## Engine Adapters

Status: implemented in `@os-probabilities/adapters` for feature rollout assignment, reward offers, and scenario execution.
