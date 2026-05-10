# OS Probabilities

Define random decisions once. Validate, simulate, explain, and run them anywhere.

[![CI](https://github.com/TPAI-dev/os-probabilities/actions/workflows/ci.yml/badge.svg)](https://github.com/TPAI-dev/os-probabilities/actions/workflows/ci.yml)
[![Pages](https://github.com/TPAI-dev/os-probabilities/actions/workflows/pages.yml/badge.svg)](https://github.com/TPAI-dev/os-probabilities/actions/workflows/pages.yml)
[![npm core](https://img.shields.io/npm/v/@os-probabilities/core.svg?label=@os-probabilities/core)](https://www.npmjs.com/package/@os-probabilities/core)
[![MIT](https://img.shields.io/badge/license-MIT-111827.svg)](LICENSE)

OS Probabilities is a deterministic probability policy system for games and apps. It is built for lootboxes, loot tables, card rewards, feature rollouts, procedural events, and any randomized decision that needs to be replayable, testable, and explainable.

- Playground: https://tpai-dev.github.io/os-probabilities/
- API docs: https://tpai-dev.github.io/os-probabilities/api/
- 5-minute lootbox guide: [docs/5-minute-lootbox.md](docs/5-minute-lootbox.md)
- Lootbox quickstart: [docs/lootbox-quickstart.md](docs/lootbox-quickstart.md)
- Spec: [docs/spec-v1.md](docs/spec-v1.md)
- Agent guide: [llms.txt](llms.txt)

## Why Not Just Weighted Random?

Weighted random picks an item. OS Probabilities gives you the operational system around the pick:

- one data policy for designers, servers, tools, and tests
- validation before a broken drop table ships
- seeded replay for support, debugging, and audits
- explanation traces showing eligibility, modifiers, weights, odds, rolls, and selected items
- simulations for balance review before release
- pity, duplicate suppression, event boosts, caps, hard drops, and guardrails without scattered random code

If your app only needs `pick one of three strings`, use a tiny weighted-random helper. If your game or product needs to prove and evolve probability behavior safely, use this.

## Lootbox In 5 Minutes

Install the runtime and adapter:

```bash
npm install @os-probabilities/core @os-probabilities/adapters
npm install -D @os-probabilities/cli @os-probabilities/schema
```

Define the policy once:

```yaml
schemaVersion: os-probabilities/v1
sources:
  loot:
    items:
      - id: coin_pack_small
        rarity: common
        tags: [currency]
        weight: 80
      - id: frost_blade
        rarity: rare
        tags: [weapon, event]
        weight: 12
      - id: dragon_mount
        rarity: legendary
        tags: [mount, legendary]
        weight: 1
tables:
  lootbox.open:
    source: loot
    draw: sample_without_replacement
    count: 3
    constraints:
      unique: true
    weights:
      base:
        path: item.weight
        default: 1
      modifiers:
        - id: event_item_boost
          kind: multiply
          factor: 2
          when:
            - path: ctx.activeEvent
              op: equals
              value: frost_festival
            - path: item.tags
              op: contains
              value: event
        - id: legendary_pity
          kind: pity
          missPath: ctx.legendaryMisses
          increasePerMiss: 0.15
          maxBonus: 5
          when:
            - path: item.rarity
              op: equals
              value: legendary
        - id: duplicate_suppression
          kind: drop
          when:
            - path: ctx.ownedItems
              op: contains
              valuePath: item.id
```

Open a box from server code:

```ts
import { createEngine } from "@os-probabilities/core";
import { createLootboxAdapter } from "@os-probabilities/adapters";

const engine = createEngine(policy);
const lootbox = createLootboxAdapter(engine, { tableId: "lootbox.open" });

const result = lootbox.open(
  {
    activeEvent: "frost_festival",
    legendaryMisses: 18,
    ownedItems: ["frost_blade"]
  },
  {
    playerId: "player-123",
    boxId: "frost-box",
    openId: "open-0001",
    trace: true
  }
);
```

`result.itemIds` is the reward. `result.trace` explains exactly how eligibility, modifiers, weights, rolls, and selected items produced it.

Run the full scenario locally:

```bash
npm run os-probabilities -- scenario examples/real-scenarios/lootbox-pity-event/scenario.yaml
```

## CLI

```bash
os-probabilities validate <config>
os-probabilities pick <tableId> --config <config> --context <context> --seed <seed> [--trace]
os-probabilities explain <tableId> --config <config> --context <context> --seed <seed>
os-probabilities simulate <tableId> --config <config> --context <context> --seed <seed> --runs <n>
os-probabilities scenario <scenario>
```

## Packages

- `@os-probabilities/core`: dependency-free TypeScript runtime and validation
- `@os-probabilities/schema`: JSON Schema for `os-probabilities/v1`
- `@os-probabilities/adapters`: lootbox, reward-offer, feature-rollout, and scenario helpers
- `@os-probabilities/cli`: validate, pick, explain, simulate, and scenario commands

## Python Balancing Tools

```bash
PYTHONPATH=tools/python python3 -m os_probabilities_balancer summarize examples/balancing/baseline-simulation.json
PYTHONPATH=tools/python python3 -m os_probabilities_balancer compare examples/balancing/baseline-simulation.json examples/balancing/candidate-simulation.json
```

## Rust/WASM

The Rust crates currently implement the deterministic primitive contract: PCG32, seed derivation, and fixed-scale decimal parsing/formatting. They are verified against the TypeScript golden vectors and provide the base for a future full Rust/WASM policy runtime.

See [docs/rust-wasm.md](docs/rust-wasm.md).

## Determinism Contract

- RNG: PCG32
- seed derivation: `os-probabilities/v1|seed|tableId|drawIndex`
- weight math: fixed-scale integer decimals with 6 fractional digits
- selection: cumulative scan in declared item order
- paths: `ctx.*` and `item.*` only
- predicates: declarative operators only, no expression evaluation

Golden vectors live in [fixtures/determinism/golden-vectors.json](fixtures/determinism/golden-vectors.json). Full runtime fixtures live in [fixtures/determinism/runtime-cases.json](fixtures/determinism/runtime-cases.json). TypeScript and Rust tests verify deterministic behavior from shared fixture files.

## When Not To Use This

Do not use OS Probabilities when a tiny helper is enough. If you only need a one-off random item, a small weighted-random function is simpler. Use this when the random decision is important enough to validate, replay, explain, simulate, audit, share across teams, or port across runtimes.

More detail: [docs/when-not-to-use.md](docs/when-not-to-use.md)

## Comparisons

- Simple weighted random helpers are smaller but usually do not give you policy validation, explanations, simulations, or replay contracts.
- Feature flag platforms handle product rollouts well, but they are not loot-table/card-reward balancing systems.
- JSON rules engines handle declarative predicates, but not deterministic weighted draws, odds traces, or sampling semantics.

See [docs/comparison.md](docs/comparison.md).

## Benchmarks And Size

Latest local numbers: `pick lootbox.open` around 40k ops/sec, `explain lootbox.open` around 38k ops/sec, and dry-run tarballs are 18.4 kB for core, 2.1 kB for schema, 3.4 kB for adapters, and 4.1 kB for CLI. Full results are in [benchmarks/latest.json](benchmarks/latest.json) and [benchmarks/README.md](benchmarks/README.md). Re-run them with:

```bash
npm run build
npm run benchmark -- --write benchmarks/latest.json
npm run pack:dry
```

## Production Integration

See [docs/production-integration.md](docs/production-integration.md) for server-side lootbox opens, support explanations, feature rollout assignments, and deployment guidance. See [docs/cross-runtime-determinism.md](docs/cross-runtime-determinism.md), [docs/python-balancing.md](docs/python-balancing.md), and [docs/game-engine-integration.md](docs/game-engine-integration.md) for runtime and integration paths.

## Verification

```bash
npm run check
npm test
npm run test:python
npm run build
npm run playground:build
npm run docs:api
npm run pack:dry
npm run smoke:install
cargo test --workspace --locked
cargo build -p os-probabilities-wasm --target wasm32-unknown-unknown --locked
```

## Release

See [RELEASE.md](RELEASE.md) and [docs/release-automation.md](docs/release-automation.md). Packages are configured for public npm trusted publishing with provenance through the release workflow.

