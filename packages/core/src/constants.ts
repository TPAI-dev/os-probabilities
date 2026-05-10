export const SCHEMA_VERSION = "os-probabilities/v1" as const;

export const DECIMAL_SCALE = 1_000_000n;

export const DRAW_KINDS = [
  "weighted_choice",
  "sample_with_replacement",
  "sample_without_replacement"
] as const;

export const PREDICATE_OPERATORS = [
  "equals",
  "notEquals",
  "in",
  "notIn",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "exists"
] as const;
