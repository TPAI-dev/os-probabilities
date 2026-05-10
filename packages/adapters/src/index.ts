import { createEngine } from "@os-probabilities/core";
import type {
  ExplainResult,
  PickResult,
  ProbabilityEngine,
  ProbabilitySpec,
  SimulationResult,
  SourceItem
} from "@os-probabilities/core";

export interface FeatureRolloutAdapterOptions {
  tableId: string;
  seedPrefix?: string;
}

export interface FeatureAssignment {
  variantId: string;
  item: SourceItem;
  seed: string;
  trace?: ExplainResult["trace"];
}

export interface RewardOfferAdapterOptions {
  tableId: string;
  seedPrefix?: string;
}

export interface RewardOffer {
  selectedIds: string[];
  selections: SourceItem[];
  seed: string;
  trace?: ExplainResult["trace"];
}

export interface LootboxAdapterOptions {
  tableId: string;
  seedPrefix?: string;
}

export interface LootboxOpenOptions {
  playerId: string | number;
  boxId: string | number;
  openId?: string | number;
  trace?: boolean;
}

export interface LootboxOpenResult {
  itemIds: string[];
  items: SourceItem[];
  seed: string;
  trace?: ExplainResult["trace"];
}

export interface ScenarioStep {
  id: string;
  tableId: string;
  context: unknown;
  seed: string | number | bigint;
  mode?: "pick" | "explain" | "simulate";
  runs?: number;
}

export interface DecisionScenario {
  id: string;
  description?: string;
  spec: ProbabilitySpec;
  steps: ScenarioStep[];
}

export type ScenarioStepResult =
  | {
      id: string;
      mode: "pick";
      result: PickResult;
    }
  | {
      id: string;
      mode: "explain";
      result: ExplainResult;
    }
  | {
      id: string;
      mode: "simulate";
      result: SimulationResult;
    };

export interface ScenarioRunResult {
  id: string;
  description?: string;
  steps: ScenarioStepResult[];
}

export function createFeatureRolloutAdapter(
  engine: ProbabilityEngine,
  options: FeatureRolloutAdapterOptions
): {
  assign(context: unknown, options: { entityId: string | number; trace?: boolean }): FeatureAssignment;
} {
  return {
    assign(context, assignmentOptions) {
      const seed = stableAdapterSeed(options.seedPrefix ?? "feature", assignmentOptions.entityId);
      const result = assignmentOptions.trace === true
        ? engine.explain(options.tableId, context, { seed })
        : engine.pick(options.tableId, context, { seed });
      const item = result.selections[0];
      if (item === undefined) {
        throw new Error("feature rollout table " + options.tableId + " returned no variant");
      }

      const assignment: FeatureAssignment = {
        variantId: item.id,
        item,
        seed
      };
      if ("trace" in result && result.trace !== undefined) {
        assignment.trace = result.trace;
      }
      return assignment;
    }
  };
}

export function createRewardOfferAdapter(
  engine: ProbabilityEngine,
  options: RewardOfferAdapterOptions
): {
  offer(context: unknown, options: { runId: string | number; nodeId?: string | number; trace?: boolean }): RewardOffer;
} {
  return {
    offer(context, offerOptions) {
      const seed = stableAdapterSeed(
        options.seedPrefix ?? "reward",
        offerOptions.runId,
        offerOptions.nodeId ?? "default"
      );
      const result = offerOptions.trace === true
        ? engine.explain(options.tableId, context, { seed })
        : engine.pick(options.tableId, context, { seed });
      const offer: RewardOffer = {
        selectedIds: result.selectedIds,
        selections: result.selections,
        seed
      };
      if ("trace" in result && result.trace !== undefined) {
        offer.trace = result.trace;
      }
      return offer;
    }
  };
}


export function createLootboxAdapter(
  engine: ProbabilityEngine,
  options: LootboxAdapterOptions
): {
  open(context: unknown, options: LootboxOpenOptions): LootboxOpenResult;
} {
  return {
    open(context, openOptions) {
      const seed = stableAdapterSeed(
        options.seedPrefix ?? "lootbox",
        openOptions.playerId,
        openOptions.boxId,
        openOptions.openId ?? "default"
      );
      const result = openOptions.trace === true
        ? engine.explain(options.tableId, context, { seed })
        : engine.pick(options.tableId, context, { seed });
      const opened: LootboxOpenResult = {
        itemIds: result.selectedIds,
        items: result.selections,
        seed
      };
      if ("trace" in result && result.trace !== undefined) {
        opened.trace = result.trace;
      }
      return opened;
    }
  };
}

export function runScenario(scenario: DecisionScenario): ScenarioRunResult {
  const engine = createEngine(scenario.spec);
  const steps = scenario.steps.map((step): ScenarioStepResult => {
    const mode = step.mode ?? "explain";
    if (mode === "simulate") {
      const runs = step.runs ?? 1000;
      return {
        id: step.id,
        mode,
        result: engine.simulate(step.tableId, step.context, { seed: step.seed, runs })
      };
    }

    if (mode === "pick") {
      return {
        id: step.id,
        mode,
        result: engine.pick(step.tableId, step.context, { seed: step.seed })
      };
    }

    return {
      id: step.id,
      mode,
      result: engine.explain(step.tableId, step.context, { seed: step.seed })
    };
  });

  const result: ScenarioRunResult = {
    id: scenario.id,
    steps
  };
  if (scenario.description !== undefined) {
    result.description = scenario.description;
  }
  return result;
}

function stableAdapterSeed(prefix: string, ...parts: Array<string | number | bigint>): string {
  return [prefix, ...parts.map((part) => String(part))].join(":");
}
