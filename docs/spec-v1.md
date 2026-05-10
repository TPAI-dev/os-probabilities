# OS Probabilities V1 Spec

## Policy Shape

A policy has `schemaVersion`, `sources`, and `tables`.

- `schemaVersion` must be `os-probabilities/v1`.
- `sources` contain declared items.
- `tables` define how items are selected from a source.

## Draw Modes

- `weighted_choice`: select one item.
- `sample_with_replacement`: select `count` items and allow repeats.
- `sample_without_replacement`: select `count` unique items.

## Paths

Predicate and weight paths may only read `ctx.*` or `item.*`.

## Predicates

Allowed operators: `equals`, `notEquals`, `in`, `notIn`, `gt`, `gte`, `lt`, `lte`, `contains`, `exists`.

## Weight Modifiers

- `multiply`: multiply current weight by `factor`.
- `add`: add `value` to current weight.
- `pity`: add `min(misses * increasePerMiss, maxBonus)` from `missPath`.
- `set`: replace current weight with `value`.
- `clamp`: enforce `min` and/or `max` guardrails.
- `drop`: set weight to zero when its predicates pass.

Modifiers run in declared order. Non-positive final weights are excluded.

## Determinism

- RNG: PCG32.
- Seed derivation: `os-probabilities/v1|seed|tableId|drawIndex`.
- Decimal math: fixed-scale integer values with 6 fractional digits.
- Selection: cumulative weight scan in declared item order.
