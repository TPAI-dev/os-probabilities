# 5-Minute Lootbox Integration

This guide shows the smallest production-shaped path: install, define a policy, validate it, run an authoritative pick, explain the result, and simulate balance.

## 1. Install

~~~bash
npm install @os-probabilities/core @os-probabilities/adapters
npm install -D @os-probabilities/cli @os-probabilities/schema
~~~

Use `@os-probabilities/core` in the authoritative runtime. Use the CLI in CI, balancing jobs, and local design review.

## 2. Define The Policy

Create `lootbox.policy.yaml`:

~~~yaml
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
      - id: aurora_crown
        rarity: legendary
        tags: [cosmetic, legendary, event]
        weight: 0.8
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
        - id: owned_duplicate_drop
          kind: drop
          when:
            - path: ctx.ownedItems
              op: contains
              valuePath: item.id
~~~

This policy declares the decision. The game server does not hand-roll weighted random, event boosts, pity, or duplicate suppression in application code.

## 3. Validate In CI

~~~bash
npx os-probabilities validate lootbox.policy.yaml
~~~

Validation catches unsupported operators, invalid paths, impossible draw counts, invalid weights, unknown sources, and other policy mistakes before deployment.

## 4. Run The Authoritative Pick

~~~ts
import { createEngine } from "@os-probabilities/core";
import { createLootboxAdapter } from "@os-probabilities/adapters";
import type { ProbabilitySpec } from "@os-probabilities/core";

export function createLootboxService(policy: ProbabilitySpec) {
  const engine = createEngine(policy);
  const lootbox = createLootboxAdapter(engine, { tableId: "lootbox.open" });

  return {
    open(input: {
      playerId: string;
      boxId: string;
      openId: string;
      activeEvent?: string;
      legendaryMisses: number;
      ownedItems: string[];
    }) {
      return lootbox.open(
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
    }
  };
}
~~~

The adapter derives a stable seed from `playerId`, `boxId`, and `openId`. Store that seed, the policy version, the table ID, selected item IDs, and references to the authoritative player state used to build context.

## 5. Explain A Player Result

~~~bash
npx os-probabilities explain lootbox.open   --config lootbox.policy.yaml   --context player-context.json   --seed lootbox:player-123:frost-box:open-0001
~~~

The trace answers support and QA questions:

- which items were eligible
- which items were excluded and why
- base weight and final weight for every candidate
- applied modifiers and their before/after values
- normalized odds
- RNG roll values
- selected item IDs

## 6. Simulate Before Release

~~~bash
npx os-probabilities simulate lootbox.open   --config lootbox.policy.yaml   --context player-context.json   --seed frost-box-v1-balance   --runs 100000
~~~

Use the output to review item rates, rarity rates, tag rates, and top selected items. For a stronger example with live-event boosts, duplicate rules, pity, and economy caps, run:

~~~bash
npm run os-probabilities -- scenario examples/real-scenarios/live-event-lootbox/scenario.yaml
~~~

## Production Rules Of Thumb

- Run player-impacting picks on the server.
- Treat client-side runs as previews only.
- Version policy files and store the policy version for every durable outcome.
- Reconstruct context from trusted server state; do not trust client-provided pity counters, ownership, or eligibility fields.
- Keep one table per durable decision. If a lootbox has a main reward and guaranteed currency, model those as two explicit tables.
- Put policy validation and scenario runs in CI.
- Simulate balance changes before release and compare against a baseline.
