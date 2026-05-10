# Production Integration Guide

OS Probabilities should run on the server for player-impacting or money-adjacent outcomes. Clients can display odds, preview policies, or run local simulations, but the authoritative pick should happen in trusted backend code.

## Server-Side Lootbox Open

```ts
import { createEngine } from "@os-probabilities/core";
import { createLootboxAdapter } from "@os-probabilities/adapters";
import policy from "./lootbox-policy.json" assert { type: "json" };

const engine = createEngine(policy);
const lootbox = createLootboxAdapter(engine, { tableId: "lootbox.open" });

export function openLootbox(input: {
  playerId: string;
  boxId: string;
  openId: string;
  activeEvent?: string;
  legendaryMisses: number;
  ownedItems: string[];
}) {
  const result = lootbox.open(
    {
      activeEvent: input.activeEvent,
      legendaryMisses: input.legendaryMisses,
      ownedItems: input.ownedItems
    },
    {
      playerId: input.playerId,
      boxId: input.boxId,
      openId: input.openId,
      trace: true
    }
  );

  return {
    itemIds: result.itemIds,
    seed: result.seed,
    trace: result.trace
  };
}
```

Store the seed, policy version, table ID, context references, and selected item IDs with the transaction. Avoid storing large context blobs directly in queues or state machines; store references and reconstruct the context from authoritative records.

## Support Explanation

```ts
const explanation = engine.explain("lootbox.open", context, {
  seed: "lootbox:player-123:frost-box:open-0001"
});

console.log(explanation.trace.draws[0].candidates);
```

The trace shows excluded items, applied modifiers, final weights, odds, RNG rolls, and selections. This is meant for internal support, QA, audit tooling, and balance review.

## Feature Rollout Assignment

```ts
import { createFeatureRolloutAdapter } from "@os-probabilities/adapters";

const rollout = createFeatureRolloutAdapter(engine, {
  tableId: "checkout.variant",
  seedPrefix: "checkout-v2"
});

const assignment = rollout.assign(
  { country: "US", plan: "pro" },
  { entityId: "account-456", trace: true }
);
```

For full hosted flag governance, use a feature flag platform. Use this adapter when you want local deterministic routing that shares the same policy, validation, and simulation tooling as the rest of your probability system.

## Deployment Guidance

- Version policy files and store the exact policy version used for each durable outcome.
- Validate policies in CI with `os-probabilities validate`.
- Run scenario fixtures for every important table.
- Simulate before release and compare against a baseline.
- Keep seeds deterministic and include stable business identifiers such as player ID, box ID, run ID, or offer ID.
- Do not let untrusted clients supply authoritative context fields such as pity counters or ownership state.

