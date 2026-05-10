# Comparison Guide

OS Probabilities sits between small random helper libraries, rules engines, feature flag systems, and custom game-server logic.

## Simple Weighted Random Libraries

Examples in this category include packages that expose `weightedChoice(items)`, `chooseWeightedIndex(weights)`, or a mutable loot table object.

Use them when:

- the table is small
- logic is code-owned
- deterministic replay is optional
- nobody needs a formal explanation trace

Use OS Probabilities instead when:

- the table has eligibility rules, modifiers, pity, duplicate suppression, caps, or replacement semantics
- designers or tools need a data policy rather than app code
- you need validation and simulation before release
- you need to replay one exact result from a seed

## Rules Engines

Rules engines are good at declarative predicates. They are not usually probability runtimes.

OS Probabilities intentionally keeps predicates small and safe, then adds the probability-specific pieces:

- weighted draws
- sampling with and without replacement
- fixed-scale decimal weight math
- deterministic RNG contract
- odds traces
- simulation summaries

A rules engine can answer "is this item eligible?" OS Probabilities answers "which eligible item was selected, with which final odds, using which seed and roll?"

## Feature Flag Platforms

Feature flag platforms are excellent for managed product rollouts, approvals, targeting, audit logs, SDK fleets, and operational kill switches.

OS Probabilities is not a replacement for those platforms. It is useful when you need feature-rollout-like deterministic bucketing inside an open policy runtime, or when the same probability system also covers game rewards and simulations.

Use a feature flag platform when you need:

- hosted flag management
- environment controls
- approvals and audit logs
- SDK streaming and flag updates
- experimentation analytics

Use OS Probabilities when you need:

- local/open-source probability policies
- game reward balancing
- deterministic explainable draws
- portable schema-first odds definitions

## Custom Game Logic

Custom logic is often the right starting point. It becomes expensive when every reward type reimplements validation, pity, duplicate handling, tracing, and simulation differently.

OS Probabilities is a good fit when the team wants one shared contract for random decisions instead of scattered helper functions.

