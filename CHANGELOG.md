# Changelog

## 0.1.0 - 2026-05-10

Initial public release.

### Added

- Dependency-free TypeScript probability runtime in `@os-probabilities/core`.
- JSON Schema package for `os-probabilities/v1`.
- CLI for validate, pick, explain, simulate, and scenario execution.
- Lootbox, reward-offer, feature-rollout, and scenario adapters.
- Production-style lootbox example with pity, event boosts, duplicate suppression, traces, and balancing simulation.
- Slay-like card reward, loot-table, and feature-rollout examples.
- Python balancing tools for summarizing and comparing simulation outputs.
- Rust/WASM deterministic primitive crates verified against TypeScript golden vectors.
- Browser playground for editing, validating, explaining, and simulating policies.
- GitHub Actions CI, Pages deployment, and npm release workflow.

### Stability

The V1 schema is usable for early adopters. The TypeScript runtime and CLI are the primary supported surfaces. Rust/WASM currently covers deterministic primitives and should be treated as experimental until the full policy runtime is ported.

