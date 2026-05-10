# Agent Guide

This repo is designed to be easy for coding agents to inspect and extend.

## Mission

OS Probabilities defines random decisions once and then validates, simulates, explains, and executes them deterministically across runtimes.

## Start Here

1. Read `README.md` for the public surface.
2. Read `docs/spec-v1.md` before changing policy shape.
3. Use `examples/real-scenarios/lootbox-pity-event/scenario.yaml` for the primary end-to-end behavior.
4. Run `npm run check`, `npm test`, `npm run test:python`, and `npm run build` after meaningful changes.

## Architecture

- `packages/core`: dependency-free TypeScript runtime and validation.
- `packages/schema`: JSON Schema for policy files.
- `packages/adapters`: integration helpers and scenario runner.
- `packages/cli`: command line interface for validate, pick, explain, simulate, and scenario.
- `tools/python`: balancing analysis for simulation JSON outputs.
- `crates`: Rust and WASM deterministic primitive source.

## Rules For Agents

- Do not add runtime dependencies to `@os-probabilities/core`.
- Do not use arbitrary expression evaluation in policy files.
- Keep policy changes schema-first and test-backed.
- Preserve deterministic replay for fixed seeds.
- Add or update examples when introducing public behavior.
- Prefer scenario fixtures over prose-only examples.
