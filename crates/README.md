# Rust And WASM Crates

These crates currently provide deterministic primitive parity with the TypeScript runtime.

- `os-probabilities-core`: PCG32, seed derivation, and fixed-scale decimal helpers
- `os-probabilities-wasm`: wasm-bindgen exports for those primitives

Run:

```bash
cargo test --workspace --locked
cargo build -p os-probabilities-wasm --target wasm32-unknown-unknown --locked
```

The full policy runtime still lives in TypeScript for V1. See [../docs/rust-wasm.md](../docs/rust-wasm.md).

