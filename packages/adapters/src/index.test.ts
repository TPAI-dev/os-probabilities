import { describe, expect, it } from "vitest";
import { createEngine } from "@os-probabilities/core";
import type { ProbabilitySpec } from "@os-probabilities/core";
import { createFeatureRolloutAdapter, createLootboxAdapter, createRewardOfferAdapter, runScenario } from "./index.js";

const spec: ProbabilitySpec = {
  schemaVersion: "os-probabilities/v1",
  sources: {
    variants: {
      items: [
        { id: "control", weight: 90, tags: ["stable"] },
        { id: "new_onboarding", weight: 10, tags: ["experiment"] }
      ]
    },
    rewards: {
      items: [
        { id: "strike_plus", weight: 1, tags: ["attack"] },
        { id: "guard_plus", weight: 1, tags: ["skill"] },
        { id: "rare_power", weight: 0.4, rarity: "rare", tags: ["power"] }
      ]
    },
    loot: {
      items: [
        { id: "gold", weight: 60, tags: ["currency"] },
        { id: "event_skin", weight: 10, tags: ["event"] },
        { id: "legendary_mount", weight: 1, rarity: "legendary", tags: ["legendary"] }
      ]
    }
  },
  tables: {
    "onboarding.variant": {
      source: "variants",
      draw: "weighted_choice",
      weights: { base: { path: "item.weight", default: 1 } }
    },
    "combat.reward": {
      source: "rewards",
      draw: "sample_without_replacement",
      count: 2,
      weights: { base: { path: "item.weight", default: 1 } }
    },
    "lootbox.open": {
      source: "loot",
      draw: "sample_without_replacement",
      count: 2,
      constraints: { unique: true },
      weights: {
        base: { path: "item.weight", default: 1 },
        modifiers: [
          {
            id: "event_boost",
            kind: "multiply",
            factor: 2,
            when: [
              { path: "ctx.activeEvent", op: "equals", value: "spring" },
              { path: "item.tags", op: "contains", value: "event" }
            ]
          },
          {
            id: "legendary_pity",
            kind: "pity",
            missPath: "ctx.legendaryMisses",
            increasePerMiss: 0.1,
            maxBonus: 3,
            when: [
              { path: "item.rarity", op: "equals", value: "legendary" }
            ]
          }
        ]
      }
    }
  }
};

describe("adapters", () => {
  it("assigns a stable feature variant for an entity", () => {
    const engine = createEngine(spec);
    const adapter = createFeatureRolloutAdapter(engine, { tableId: "onboarding.variant" });
    const first = adapter.assign({ accountTier: "beta" }, { entityId: "user-1", trace: true });
    const second = adapter.assign({ accountTier: "beta" }, { entityId: "user-1", trace: true });

    expect(second.variantId).toBe(first.variantId);
    expect(first.trace).toBeDefined();
  });

  it("offers deterministic reward choices", () => {
    const engine = createEngine(spec);
    const adapter = createRewardOfferAdapter(engine, { tableId: "combat.reward" });
    const offer = adapter.offer({}, { runId: "run-1", nodeId: "floor-1", trace: true });

    expect(offer.selectedIds).toHaveLength(2);
    expect(new Set(offer.selectedIds).size).toBe(2);
    expect(offer.trace).toBeDefined();
  });


  it("opens lootboxes with stable player and box seeds", () => {
    const engine = createEngine(spec);
    const adapter = createLootboxAdapter(engine, { tableId: "lootbox.open" });
    const first = adapter.open(
      { activeEvent: "spring", legendaryMisses: 12 },
      { playerId: "player-1", boxId: "spring-box", openId: "open-1", trace: true }
    );
    const second = adapter.open(
      { activeEvent: "spring", legendaryMisses: 12 },
      { playerId: "player-1", boxId: "spring-box", openId: "open-1", trace: true }
    );

    expect(second.itemIds).toEqual(first.itemIds);
    expect(first.itemIds).toHaveLength(2);
    expect(first.trace).toBeDefined();
  });

  it("runs decision scenarios", () => {
    const result = runScenario({
      id: "adapter-smoke",
      description: "Adapters can execute pick, explain, and simulate steps.",
      spec,
      steps: [
        { id: "variant", tableId: "onboarding.variant", context: {}, seed: "scenario-1", mode: "explain" },
        { id: "reward-sim", tableId: "combat.reward", context: {}, seed: "scenario-1", mode: "simulate", runs: 20 }
      ]
    });

    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]?.mode).toBe("explain");
    expect(result.steps[1]?.mode).toBe("simulate");
  });
});
