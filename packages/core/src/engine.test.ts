import { describe, expect, it } from "vitest";
import { createEngine } from "./engine.js";
import type { ProbabilitySpec } from "./types.js";

const spec: ProbabilitySpec = {
  schemaVersion: "os-probabilities/v1",
  sources: {
    cards: {
      items: [
        {
          id: "poisoned_dagger",
          character: "silent",
          unlocked: true,
          rarity: "common",
          tags: ["attack", "poison"],
          baseWeight: 1
        },
        {
          id: "backflip",
          character: "silent",
          unlocked: true,
          rarity: "common",
          tags: ["skill", "draw"],
          baseWeight: 1
        },
        {
          id: "corpse_explosion",
          character: "silent",
          unlocked: true,
          rarity: "rare",
          tags: ["skill", "poison"],
          baseWeight: 0.25
        }
      ]
    }
  },
  tables: {
    "combat.card_reward": {
      source: "cards",
      draw: "sample_without_replacement",
      count: 2,
      constraints: {
        unique: true
      },
      eligibility: [
        {
          path: "item.character",
          op: "equals",
          valuePath: "ctx.character"
        },
        {
          path: "item.unlocked",
          op: "equals",
          value: true
        }
      ],
      weights: {
        base: {
          path: "item.baseWeight",
          default: 1
        },
        modifiers: [
          {
            id: "poison_synergy",
            kind: "multiply",
            factor: 1.25,
            when: [
              {
                path: "ctx.deckTags.poison",
                op: "gte",
                value: 3
              },
              {
                path: "item.tags",
                op: "contains",
                value: "poison"
              }
            ]
          },
          {
            id: "recently_offered_suppression",
            kind: "multiply",
            factor: 0.2,
            when: [
              {
                path: "ctx.recentlyOffered",
                op: "contains",
                valuePath: "item.id"
              }
            ]
          },
          {
            id: "rare_miss_pity",
            kind: "pity",
            missPath: "ctx.rareMisses",
            increasePerMiss: 0.05,
            maxBonus: 0.4,
            when: [
              {
                path: "item.rarity",
                op: "equals",
                value: "rare"
              }
            ]
          }
        ]
      }
    }
  }
};

const context = {
  character: "silent",
  deckTags: {
    poison: 4
  },
  recentlyOffered: ["backflip"],
  rareMisses: 5
};

describe("createEngine", () => {
  it("replays deterministic selections for the same seed", () => {
    const engine = createEngine(spec);
    const first = engine.pick("combat.card_reward", context, { seed: "run-001" });
    const second = engine.pick("combat.card_reward", context, { seed: "run-001" });

    expect(second.selectedIds).toEqual(first.selectedIds);
    expect(new Set(first.selectedIds).size).toBe(first.selectedIds.length);
  });

  it("explains candidate weights, modifiers, rolls, exclusions, and selections", () => {
    const engine = createEngine(spec);
    const result = engine.explain("combat.card_reward", context, { seed: "run-001" });
    const firstDraw = result.trace.draws[0];

    expect(result.trace.selectedIds).toEqual(result.selectedIds);
    expect(firstDraw).toBeDefined();
    expect(firstDraw?.candidateCount).toBe(3);
    expect(firstDraw?.roll).toEqual(expect.any(String));
    expect(firstDraw?.selectedId).toEqual(expect.any(String));
    expect(firstDraw?.candidates.find((candidate) => candidate.id === "poisoned_dagger")).toMatchObject({
      baseWeight: "1",
      finalWeight: "1.25",
      appliedModifiers: [
        expect.objectContaining({
          id: "poison_synergy",
          kind: "multiply"
        })
      ]
    });
    expect(firstDraw?.candidates.find((candidate) => candidate.id === "backflip")).toMatchObject({
      baseWeight: "1",
      finalWeight: "0.2",
      appliedModifiers: [
        expect.objectContaining({
          id: "recently_offered_suppression",
          kind: "multiply"
        })
      ]
    });
    expect(firstDraw?.candidates.find((candidate) => candidate.id === "corpse_explosion")).toMatchObject({
      baseWeight: "0.25",
      finalWeight: "0.5625",
      appliedModifiers: [
        expect.objectContaining({
          id: "poison_synergy",
          kind: "multiply"
        }),
        expect.objectContaining({
          id: "rare_miss_pity",
          kind: "pity"
        })
      ]
    });
  });

  it("simulates selection, tag, rarity, and top item frequencies", () => {
    const engine = createEngine(spec);
    const result = engine.simulate("combat.card_reward", context, {
      seed: "sim-001",
      runs: 100
    });

    expect(result.runs).toBe(100);
    expect(result.totalSelections).toBe(200);
    expect(result.selectionCounts["poisoned_dagger"]?.count).toBeGreaterThan(0);
    expect(result.tagFrequencies["poison"]?.count).toBeGreaterThan(0);
    expect(result.rarityFrequencies["rare"]?.count).toBeGreaterThan(0);
    expect(result.topSelected.length).toBeGreaterThan(0);
  });

  it("applies set, clamp, and drop policy primitives", () => {
    const engine = createEngine({
      schemaVersion: "os-probabilities/v1",
      sources: {
        outcomes: {
          items: [
            { id: "normal", baseWeight: 1 },
            { id: "forced", baseWeight: 1 },
            { id: "cooldown", baseWeight: 5 }
          ]
        }
      },
      tables: {
        "primitive.test": {
          source: "outcomes",
          draw: "weighted_choice",
          weights: {
            base: { path: "item.baseWeight", default: 1 },
            modifiers: [
              {
                id: "force_priority",
                kind: "set",
                value: 10,
                when: [
                  { path: "item.id", op: "equals", value: "forced" }
                ]
              },
              {
                id: "cap_priority",
                kind: "clamp",
                max: 2,
                when: [
                  { path: "item.id", op: "equals", value: "forced" }
                ]
              },
              {
                id: "cooldown_drop",
                kind: "drop",
                when: [
                  { path: "ctx.cooldowns", op: "contains", valuePath: "item.id" }
                ]
              }
            ]
          }
        }
      }
    });

    const result = engine.explain("primitive.test", { cooldowns: ["cooldown"] }, { seed: "primitive-seed" });
    const draw = result.trace.draws[0];

    expect(draw?.candidates.find((candidate) => candidate.id === "forced")).toMatchObject({
      baseWeight: "1",
      finalWeight: "2"
    });
    expect(draw?.excluded).toContainEqual({
      id: "cooldown",
      reasons: ["final weight is non-positive"]
    });
  });

});
