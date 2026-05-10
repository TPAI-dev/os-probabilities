import { SCHEMA_VERSION } from "./constants.js";
import { formatScaled, multiplyScaled, parseDecimal } from "./decimal.js";
import { ProbabilityRuntimeError, ProbabilityValidationError } from "./errors.js";
import { readDataPath } from "./paths.js";
import { evaluatePredicate, predicatesPass } from "./predicates.js";
import { deriveSeed, Pcg32 } from "./rng.js";
import type {
  AppliedModifierTrace,
  CandidateTrace,
  DrawTrace,
  ExplainResult,
  PickOptions,
  PickResult,
  ProbabilityEngine,
  ProbabilitySpec,
  SimulateOptions,
  SimulationCount,
  SimulationResult,
  SourceItem,
  TableSpec,
  WeightBase,
  WeightModifier
} from "./types.js";
import { validateSpec } from "./validate.js";

interface WeightedCandidate {
  item: SourceItem;
  declaredIndex: number;
  baseWeight: bigint;
  finalWeight: bigint;
  appliedModifiers: AppliedModifierTrace[];
}

interface CandidateSet {
  candidates: WeightedCandidate[];
  excluded: DrawTrace["excluded"];
}

export function createEngine(spec: ProbabilitySpec): ProbabilityEngine {
  const validation = validateSpec(spec);
  if (!validation.valid) {
    throw new ProbabilityValidationError(validation.errors);
  }

  return {
    pick(tableId, context, options) {
      return pick(spec, tableId, context, options);
    },
    explain(tableId, context, options) {
      return explain(spec, tableId, context, options);
    },
    simulate(tableId, context, options) {
      return simulate(spec, tableId, context, options);
    }
  };
}

function pick(
  spec: ProbabilitySpec,
  tableId: string,
  context: unknown,
  options: PickOptions
): PickResult {
  const seed = normalizeSeed(options.seed);
  const table = getTable(spec, tableId);
  const items = getSourceItems(spec, table);
  const count = getDrawCount(table);
  const forceUnique = table.draw === "sample_without_replacement" || table.constraints?.unique === true;
  const selectedIds = new Set<string>();
  const selections: SourceItem[] = [];
  const drawTraces: DrawTrace[] = [];

  for (let drawIndex = 0; drawIndex < count; drawIndex += 1) {
    const candidateSet = buildCandidateSet(table, items, context, selectedIds, forceUnique);
    if (candidateSet.candidates.length === 0) {
      throw new ProbabilityRuntimeError(`table ${tableId} has no eligible positive-weight candidates at draw ${drawIndex}`);
    }

    const totalWeight = sumWeights(candidateSet.candidates);
    if (totalWeight <= 0n) {
      throw new ProbabilityRuntimeError(`table ${tableId} has zero total weight at draw ${drawIndex}`);
    }

    const rng = new Pcg32(deriveSeed(seed, tableId, drawIndex));
    const roll = rng.nextBigIntBelow(totalWeight);
    const selected = selectCandidate(candidateSet.candidates, roll);
    selections.push(selected.item);
    selectedIds.add(selected.item.id);

    if (options.trace === true) {
      drawTraces.push(toDrawTrace(drawIndex, candidateSet, totalWeight, roll, selected.item.id));
    }
  }

  const selectedIdList = selections.map((item) => item.id);
  const result: PickResult = {
    tableId,
    seed,
    selectedIds: selectedIdList,
    selections
  };

  if (options.trace === true) {
    result.trace = {
      tableId,
      seed,
      draw: table.draw,
      requestedCount: count,
      selectedIds: selectedIdList,
      draws: drawTraces
    };
  }

  return result;
}

function explain(
  spec: ProbabilitySpec,
  tableId: string,
  context: unknown,
  options: PickOptions
): ExplainResult {
  const result = pick(spec, tableId, context, { ...options, trace: true });
  if (result.trace === undefined) {
    throw new ProbabilityRuntimeError("explain failed to produce a trace");
  }
  return result as ExplainResult;
}

function simulate(
  spec: ProbabilitySpec,
  tableId: string,
  context: unknown,
  options: SimulateOptions
): SimulationResult {
  if (!Number.isInteger(options.runs) || options.runs < 1) {
    throw new ProbabilityRuntimeError("simulate requires a positive integer run count");
  }

  const seed = normalizeSeed(options.seed);
  const selectionCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  const rarityCounts: Record<string, number> = {};
  const table = getTable(spec, tableId);
  const sourceItems = getSourceItems(spec, table);
  const declaredOrder = new Map(sourceItems.map((item, index) => [item.id, index]));
  let totalSelections = 0;

  for (let runIndex = 0; runIndex < options.runs; runIndex += 1) {
    const result = pick(spec, tableId, context, {
      seed: `${seed}:${runIndex}`
    });

    for (const item of result.selections) {
      totalSelections += 1;
      increment(selectionCounts, item.id);

      if (Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          increment(tagCounts, tag);
        }
      }

      if (typeof item.rarity === "string") {
        increment(rarityCounts, item.rarity);
      }
    }
  }

  const selectionCountsWithRates = withRates(selectionCounts, options.runs);
  const topSelected = Object.entries(selectionCountsWithRates)
    .map(([id, count]) => ({ id, ...count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return (declaredOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER)
        - (declaredOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER);
    })
    .slice(0, 10);

  return {
    tableId,
    seed,
    runs: options.runs,
    totalSelections,
    selectionCounts: selectionCountsWithRates,
    tagFrequencies: withRates(tagCounts, options.runs),
    rarityFrequencies: withRates(rarityCounts, options.runs),
    topSelected
  };
}

function buildCandidateSet(
  table: TableSpec,
  items: SourceItem[],
  context: unknown,
  selectedIds: Set<string>,
  forceUnique: boolean
): CandidateSet {
  const candidates: WeightedCandidate[] = [];
  const excluded: DrawTrace["excluded"] = [];

  items.forEach((item, declaredIndex) => {
    const reasons: string[] = [];

    if (forceUnique && selectedIds.has(item.id)) {
      reasons.push("already selected");
    }

    for (const predicate of table.eligibility ?? []) {
      const evaluation = evaluatePredicate(predicate, context, item);
      if (!evaluation.passed) {
        reasons.push(evaluation.reason ?? "predicate failed");
      }
    }

    if (reasons.length > 0) {
      excluded.push({ id: item.id, reasons });
      return;
    }

    const weighted = evaluateWeight(table, item, context, declaredIndex);
    if (weighted.finalWeight <= 0n) {
      excluded.push({ id: item.id, reasons: ["final weight is non-positive"] });
      return;
    }

    candidates.push(weighted);
  });

  return { candidates, excluded };
}

function evaluateWeight(
  table: TableSpec,
  item: SourceItem,
  context: unknown,
  declaredIndex: number
): WeightedCandidate {
  const baseWeight = resolveBaseWeight(table.weights?.base, item, context);
  let finalWeight = baseWeight;
  const appliedModifiers: AppliedModifierTrace[] = [];

  for (const modifier of table.weights?.modifiers ?? []) {
    if (!predicatesPass(modifier.when, context, item)) {
      continue;
    }

    const before = finalWeight;
    finalWeight = applyModifier(finalWeight, modifier, context, item);
    appliedModifiers.push({
      id: modifier.id,
      kind: modifier.kind,
      delta: formatScaled(finalWeight - before),
      before: formatScaled(before),
      after: formatScaled(finalWeight)
    });
  }

  return {
    item,
    declaredIndex,
    baseWeight,
    finalWeight,
    appliedModifiers
  };
}

function resolveBaseWeight(base: WeightBase | undefined, item: SourceItem, context: unknown): bigint {
  if (base === undefined) {
    if (item.weight !== undefined) {
      return requireNonNegativeDecimal(item.weight, `item ${item.id} weight`);
    }
    return 1_000_000n;
  }

  if (typeof base === "number" || typeof base === "string") {
    return requireNonNegativeDecimal(base, "table base weight");
  }

  if (base.value !== undefined) {
    return requireNonNegativeDecimal(base.value, "table base weight value");
  }

  if (base.path !== undefined) {
    const value = readDataPath(base.path, context, item);
    if (value === undefined) {
      if (base.default !== undefined) {
        return requireNonNegativeDecimal(base.default, "table base weight default");
      }
      return 0n;
    }
    return requireNonNegativeDecimal(value, `table base weight path ${base.path}`);
  }

  return 1_000_000n;
}

function applyModifier(
  currentWeight: bigint,
  modifier: WeightModifier,
  context: unknown,
  item: SourceItem
): bigint {
  if (modifier.kind === "multiply") {
    const factor = requireNonNegativeDecimal(modifier.factor, `modifier ${modifier.id} factor`);
    return multiplyScaled(currentWeight, factor);
  }

  if (modifier.kind === "add") {
    const value = requireNonNegativeDecimal(modifier.value, `modifier ${modifier.id} value`);
    return currentWeight + value;
  }

  if (modifier.kind === "set") {
    return requireNonNegativeDecimal(modifier.value, `modifier ${modifier.id} value`);
  }

  if (modifier.kind === "clamp") {
    let nextWeight = currentWeight;
    if (modifier.min !== undefined) {
      const min = requireNonNegativeDecimal(modifier.min, `modifier ${modifier.id} min`);
      if (nextWeight < min) {
        nextWeight = min;
      }
    }
    if (modifier.max !== undefined) {
      const max = requireNonNegativeDecimal(modifier.max, `modifier ${modifier.id} max`);
      if (nextWeight > max) {
        nextWeight = max;
      }
    }
    return nextWeight;
  }

  if (modifier.kind === "drop") {
    return 0n;
  }

  const misses = readDataPath(modifier.missPath, context, item);
  if (typeof misses !== "number" || !Number.isFinite(misses) || misses <= 0) {
    return currentWeight;
  }

  const increasePerMiss = requireNonNegativeDecimal(
    modifier.increasePerMiss,
    `modifier ${modifier.id} increasePerMiss`
  );
  const maxBonus = requireNonNegativeDecimal(modifier.maxBonus, `modifier ${modifier.id} maxBonus`);
  const rawBonus = BigInt(Math.floor(misses)) * increasePerMiss;
  return currentWeight + (rawBonus > maxBonus ? maxBonus : rawBonus);
}

function selectCandidate(candidates: WeightedCandidate[], roll: bigint): WeightedCandidate {
  let cursor = 0n;

  for (const candidate of candidates) {
    cursor += candidate.finalWeight;
    if (roll < cursor) {
      return candidate;
    }
  }

  const fallback = candidates.at(-1);
  if (fallback === undefined) {
    throw new ProbabilityRuntimeError("cannot select from an empty candidate set");
  }
  return fallback;
}

function toDrawTrace(
  drawIndex: number,
  candidateSet: CandidateSet,
  totalWeight: bigint,
  roll: bigint,
  selectedId: string
): DrawTrace {
  return {
    drawIndex,
    candidateCount: candidateSet.candidates.length,
    excluded: candidateSet.excluded,
    candidates: candidateSet.candidates.map((candidate) => toCandidateTrace(candidate, totalWeight)),
    totalWeight: formatScaled(totalWeight),
    roll: formatScaled(roll),
    selectedId
  };
}

function toCandidateTrace(candidate: WeightedCandidate, totalWeight: bigint): CandidateTrace {
  return {
    id: candidate.item.id,
    declaredIndex: candidate.declaredIndex,
    baseWeight: formatScaled(candidate.baseWeight),
    finalWeight: formatScaled(candidate.finalWeight),
    finalOdds: Number(candidate.finalWeight) / Number(totalWeight),
    appliedModifiers: candidate.appliedModifiers
  };
}

function getTable(spec: ProbabilitySpec, tableId: string): TableSpec {
  const table = spec.tables[tableId];
  if (table === undefined) {
    throw new ProbabilityRuntimeError(`unknown table ${tableId}`);
  }
  return table;
}

function getSourceItems(spec: ProbabilitySpec, table: TableSpec): SourceItem[] {
  const source = spec.sources[table.source];
  if (source === undefined) {
    throw new ProbabilityRuntimeError(`unknown source ${table.source}`);
  }
  return source.items;
}

function getDrawCount(table: TableSpec): number {
  if (table.draw === "weighted_choice") {
    return 1;
  }

  if (table.count === undefined) {
    throw new ProbabilityRuntimeError(`${table.draw} requires count`);
  }

  return table.count;
}

function sumWeights(candidates: WeightedCandidate[]): bigint {
  return candidates.reduce((total, candidate) => total + candidate.finalWeight, 0n);
}

function requireNonNegativeDecimal(value: unknown, label: string): bigint {
  const parsed = parseDecimal(value);
  if (!parsed.ok) {
    throw new ProbabilityRuntimeError(`${label}: ${parsed.message}`);
  }
  if (parsed.value < 0n) {
    throw new ProbabilityRuntimeError(`${label}: expected a non-negative decimal`);
  }
  return parsed.value;
}

function normalizeSeed(seed: PickOptions["seed"]): string {
  return String(seed);
}

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

function withRates(counts: Record<string, number>, runs: number): Record<string, SimulationCount> {
  return Object.fromEntries(
    Object.entries(counts).map(([key, count]) => [
      key,
      {
        count,
        ratePerRun: count / runs
      }
    ])
  );
}

export const runtimeContract = {
  schemaVersion: SCHEMA_VERSION,
  rng: "pcg32",
  seedDerivation: "os-probabilities/v1|seed|tableId|drawIndex",
  weightMath: "fixed-scale-int-6",
  sampling: "cumulative-declared-order"
} as const;
