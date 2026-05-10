# Rust And WASM

Rust/WASM support is intentionally scoped in V1.

## Current Status

The Rust crates implement deterministic primitives:

- PCG32 RNG
- UTF-8 seed normalization through the shared hash contract
- draw seed derivation
- fixed-scale decimal parse and format behavior

The WASM crate exposes those primitives to JavaScript via `wasm-bindgen`.

## What Is Verified

`cargo test --workspace --locked` verifies the Rust primitives against the same golden vectors used by the TypeScript runtime. The wasm target is verified with:

```bash
cargo build -p os-probabilities-wasm --target wasm32-unknown-unknown --locked
```

## What Is Not Done Yet

The full policy runtime has not been ported to Rust. In V1, TypeScript is the supported engine for validating, explaining, picking, and simulating policies.

## Why Keep Rust/WASM In The Repo Now?

The deterministic contract is the hardest part to retrofit later. Keeping Rust/WASM primitives in lockstep with TypeScript makes future ports safer and gives contributors a small, testable surface to extend.

## Roadmap

1. Port path reads and predicates.
2. Port fixed-scale weight modifier evaluation.
3. Port weighted choice and sampling semantics.
4. Add cross-runtime fixtures for full policy traces.
5. Package WASM for browser and Node consumers.

