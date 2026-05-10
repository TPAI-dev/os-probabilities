# Cross-Runtime Determinism

The core promise is that the same declared decision can be validated, simulated, explained, and executed across runtimes without hidden behavior.

## Contract

V1 fixes these details:

- schema version: `os-probabilities/v1`
- RNG: PCG32
- seed normalization: UTF-8 string input
- seed derivation: `os-probabilities/v1|seed|tableId|drawIndex`
- weight math: fixed-scale integer decimals with 6 fractional digits
- sampling: cumulative scan in declared item order
- paths: `ctx.*` and `item.*` only
- predicates: declarative operators only

## Fixture Files

- `fixtures/determinism/golden-vectors.json`: primitive vectors for RNG, seed derivation, and decimal formatting.
- `fixtures/determinism/runtime-cases.json`: complete policy cases with expected selected IDs, explanation traces, and simulation output.

TypeScript tests assert full runtime behavior from `runtime-cases.json`. Rust tests assert primitive parity from `golden-vectors.json`. The Rust/WASM roadmap should not add higher-level policy execution until it can pass the same fixture corpus.

## Adding A New Runtime

A new runtime should implement this sequence:

1. Parse UTF-8 seeds exactly as the fixture expects.
2. Match PCG32 uint32 output from `golden-vectors.json`.
3. Match derived seed strings exactly.
4. Match decimal parsing and formatting exactly.
5. Match eligibility and predicate evaluation.
6. Match fixed-scale modifier application.
7. Match cumulative declared-order sampling.
8. Match trace output for every case in `runtime-cases.json`.

If any fixture differs, the implementation is not compatible with V1.
