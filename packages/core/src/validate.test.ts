import { describe, expect, it } from "vitest";
import { validateSpec } from "./validate.js";
import type { ProbabilitySpec } from "./types.js";

const validSpec: ProbabilitySpec = {
  schemaVersion: "os-probabilities/v1",
  sources: {
    rewards: {
      items: [
        { id: "common", weight: 10 },
        { id: "rare", weight: 1, rarity: "rare" }
      ]
    }
  },
  tables: {
    "reward.pick": {
      source: "rewards",
      draw: "weighted_choice"
    }
  }
};

describe("validateSpec", () => {
  it("accepts a valid V1 policy", () => {
    expect(validateSpec(validSpec)).toEqual({
      valid: true,
      errors: [],
      warnings: []
    });
  });

  it("rejects missing schema version", () => {
    const result = validateSpec({ ...validSpec, schemaVersion: "other/v1" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: "schemaVersion",
      message: "expected os-probabilities/v1"
    });
  });

  it("rejects unknown table sources", () => {
    const result = validateSpec({
      ...validSpec,
      tables: {
        "reward.pick": {
          source: "missing",
          draw: "weighted_choice"
        }
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: "tables.reward.pick.source",
      message: "unknown source missing"
    });
  });

  it("rejects invalid predicate operators and paths", () => {
    const result = validateSpec({
      ...validSpec,
      tables: {
        "reward.pick": {
          source: "rewards",
          draw: "weighted_choice",
          eligibility: [
            {
              path: "global.bad",
              op: "eval"
            }
          ]
        }
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          path: "tables.reward.pick.eligibility.0.path",
          message: "expected a ctx.* or item.* path"
        },
        {
          path: "tables.reward.pick.eligibility.0.op",
          message: "expected one of equals, notEquals, in, notIn, gt, gte, lt, lte, contains, exists"
        }
      ])
    );
  });

  it("rejects negative weights", () => {
    const result = validateSpec({
      ...validSpec,
      sources: {
        rewards: {
          items: [{ id: "bad", weight: -1 }]
        }
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: "sources.rewards.items.0.weight",
      message: "expected a non-negative decimal"
    });
  });

  it("rejects obvious zero-total tables", () => {
    const result = validateSpec({
      ...validSpec,
      tables: {
        "reward.pick": {
          source: "rewards",
          draw: "weighted_choice",
          weights: {
            base: 0
          }
        }
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: "tables.reward.pick.weights.base",
      message: "table has an obvious zero total weight"
    });
  });

  it("rejects invalid draw counts", () => {
    const result = validateSpec({
      ...validSpec,
      tables: {
        "reward.pick": {
          source: "rewards",
          draw: "sample_without_replacement"
        }
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: "tables.reward.pick.count",
      message: "sample_without_replacement requires count"
    });
  });
});
