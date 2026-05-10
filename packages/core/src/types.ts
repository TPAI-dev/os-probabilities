import type { DRAW_KINDS, PREDICATE_OPERATORS, SCHEMA_VERSION } from "./constants.js";

export type SchemaVersion = typeof SCHEMA_VERSION;
export type DrawKind = (typeof DRAW_KINDS)[number];
export type PredicateOperator = (typeof PREDICATE_OPERATORS)[number];
export type DataPath = `ctx.${string}` | `item.${string}`;
export type DecimalValue = number | string;

export interface ProbabilitySpec {
  schemaVersion: SchemaVersion;
  sources: Record<string, SourceSpec>;
  tables: Record<string, TableSpec>;
}

export interface SourceSpec {
  items: SourceItem[];
}

export interface SourceItem {
  id: string;
  weight?: DecimalValue;
  tags?: string[];
  rarity?: string;
  [key: string]: unknown;
}

export interface Predicate {
  path: DataPath;
  op: PredicateOperator;
  value?: unknown;
  valuePath?: DataPath;
}

export type WeightBase =
  | DecimalValue
  | {
      path?: DataPath;
      value?: DecimalValue;
      default?: DecimalValue;
    };

export type WeightModifier = MultiplyModifier | AddModifier | PityModifier | SetModifier | ClampModifier | DropModifier;

export interface ModifierBase {
  id: string;
  when?: Predicate[];
}

export interface MultiplyModifier extends ModifierBase {
  kind: "multiply";
  factor: DecimalValue;
}

export interface AddModifier extends ModifierBase {
  kind: "add";
  value: DecimalValue;
}

export interface PityModifier extends ModifierBase {
  kind: "pity";
  missPath: DataPath;
  increasePerMiss: DecimalValue;
  maxBonus: DecimalValue;
}

export interface SetModifier extends ModifierBase {
  kind: "set";
  value: DecimalValue;
}

export interface ClampModifier extends ModifierBase {
  kind: "clamp";
  min?: DecimalValue;
  max?: DecimalValue;
}

export interface DropModifier extends ModifierBase {
  kind: "drop";
}

export interface WeightSpec {
  base?: WeightBase;
  modifiers?: WeightModifier[];
}

export interface TableConstraints {
  unique?: boolean;
}

export interface TableSpec {
  source: string;
  draw: DrawKind;
  count?: number;
  eligibility?: Predicate[];
  weights?: WeightSpec;
  constraints?: TableConstraints;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface PickOptions {
  seed: string | number | bigint;
  trace?: boolean;
}

export interface SimulateOptions {
  seed: string | number | bigint;
  runs: number;
}

export interface PickResult {
  tableId: string;
  seed: string;
  selectedIds: string[];
  selections: SourceItem[];
  trace?: DecisionTrace;
}

export interface ExplainResult extends PickResult {
  trace: DecisionTrace;
}

export interface DecisionTrace {
  tableId: string;
  seed: string;
  draw: DrawKind;
  requestedCount: number;
  selectedIds: string[];
  draws: DrawTrace[];
}

export interface DrawTrace {
  drawIndex: number;
  candidateCount: number;
  excluded: ExcludedItemTrace[];
  candidates: CandidateTrace[];
  totalWeight: string;
  roll: string;
  selectedId: string;
}

export interface ExcludedItemTrace {
  id: string;
  reasons: string[];
}

export interface CandidateTrace {
  id: string;
  declaredIndex: number;
  baseWeight: string;
  finalWeight: string;
  finalOdds: number;
  appliedModifiers: AppliedModifierTrace[];
}

export interface AppliedModifierTrace {
  id: string;
  kind: WeightModifier["kind"];
  delta: string;
  before: string;
  after: string;
}

export interface SimulationCount {
  count: number;
  ratePerRun: number;
}

export interface SimulationTopItem extends SimulationCount {
  id: string;
}

export interface SimulationResult {
  tableId: string;
  seed: string;
  runs: number;
  totalSelections: number;
  selectionCounts: Record<string, SimulationCount>;
  tagFrequencies: Record<string, SimulationCount>;
  rarityFrequencies: Record<string, SimulationCount>;
  topSelected: SimulationTopItem[];
}

export interface ProbabilityEngine {
  pick(tableId: string, context: unknown, options: PickOptions): PickResult;
  explain(tableId: string, context: unknown, options: PickOptions): ExplainResult;
  simulate(tableId: string, context: unknown, options: SimulateOptions): SimulationResult;
}
