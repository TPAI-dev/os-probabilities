# Lootbox Quickstart

This guide shows why OS Probabilities is useful for a real lootbox system.

## The Problem

A production lootbox usually needs more than weighted random:

- event item boosts
- legendary pity after repeated misses
- duplicate suppression for owned cosmetics
- unique rewards per open
- simulation before release
- replayable results for support and audits

Putting that logic in scattered game-server code makes it hard to test and hard to explain. OS Probabilities moves it into one validated policy.

## Run The Scenario

```bash
npm install
npm run build
npm run os-probabilities -- scenario examples/real-scenarios/lootbox-pity-event/scenario.yaml
```

The scenario includes three steps:

- explain one player open
- explain the guaranteed currency roll
- simulate 1,000 opens for balance review

## Use It In A Game Server

```ts
import { createEngine } from "@os-probabilities/core";
import { createLootboxAdapter } from "@os-probabilities/adapters";

const engine = createEngine(policy);
const lootbox = createLootboxAdapter(engine, { tableId: "lootbox.open" });

export function openLootbox(player: Player, box: Lootbox) {
  return lootbox.open(
    {
      activeEvent: box.activeEvent,
      legendaryMisses: player.legendaryMisses,
      ownedItems: player.ownedItemIds
    },
    {
      playerId: player.id,
      boxId: box.id,
      openId: box.openId,
      trace: true
    }
  );
}
```

Persist the seed and selected item IDs with the transaction. Keep the trace for internal support/audit tooling when needed.

## Balance Before Release

```bash
npm run os-probabilities -- simulate lootbox.open \
  --config examples/lootbox/prob.yaml \
  --context examples/lootbox/frost-player.json \
  --seed frost-box-v1 \
  --runs 100000
```

Review item rates, tag rates, rarity rates, and top selected items. Then compare two simulation outputs with the Python tools:

```bash
PYTHONPATH=tools/python python3 -m os_probabilities_balancer compare baseline.json candidate.json --threshold 0.02
```

## Explain A Player Result

```bash
npm run os-probabilities -- explain lootbox.open \
  --config examples/lootbox/prob.yaml \
  --context examples/lootbox/frost-player.json \
  --seed player-123:frost-box:open-0001
```

The trace shows:

- which items were eligible
- which items were excluded
- each candidate's base and final weight
- event, pity, duplicate, and clamp modifiers
- final odds
- the roll value
- selected item IDs
