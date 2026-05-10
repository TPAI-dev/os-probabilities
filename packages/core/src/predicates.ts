import { readDataPath } from "./paths.js";
import type { Predicate, SourceItem } from "./types.js";

export interface PredicateEvaluation {
  passed: boolean;
  reason?: string;
}

export function evaluatePredicate(
  predicate: Predicate,
  context: unknown,
  item: SourceItem
): PredicateEvaluation {
  const actual = readDataPath(predicate.path, context, item);
  const expected = predicate.valuePath === undefined
    ? predicate.value
    : readDataPath(predicate.valuePath, context, item);
  const passed = compare(predicate.op, actual, expected);

  if (passed) {
    return { passed };
  }

  return {
    passed,
    reason: `${predicate.path} ${predicate.op} ${formatValue(expected)}`
  };
}

export function predicatesPass(
  predicates: readonly Predicate[] | undefined,
  context: unknown,
  item: SourceItem
): boolean {
  if (predicates === undefined) {
    return true;
  }

  return predicates.every((predicate) => evaluatePredicate(predicate, context, item).passed);
}

function compare(op: Predicate["op"], actual: unknown, expected: unknown): boolean {
  switch (op) {
    case "equals":
      return valuesEqual(actual, expected);
    case "notEquals":
      return !valuesEqual(actual, expected);
    case "in":
      return Array.isArray(expected) && expected.some((value) => valuesEqual(value, actual));
    case "notIn":
      return Array.isArray(expected) && !expected.some((value) => valuesEqual(value, actual));
    case "gt":
      return compareNumbers(actual, expected, (left, right) => left > right);
    case "gte":
      return compareNumbers(actual, expected, (left, right) => left >= right);
    case "lt":
      return compareNumbers(actual, expected, (left, right) => left < right);
    case "lte":
      return compareNumbers(actual, expected, (left, right) => left <= right);
    case "contains":
      return containsValue(actual, expected);
    case "exists":
      return expected === false ? actual === undefined : actual !== undefined;
  }
}

function compareNumbers(
  actual: unknown,
  expected: unknown,
  comparator: (left: number, right: number) => boolean
): boolean {
  return typeof actual === "number"
    && Number.isFinite(actual)
    && typeof expected === "number"
    && Number.isFinite(expected)
    && comparator(actual, expected);
}

function containsValue(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(actual)) {
    return actual.some((value) => valuesEqual(value, expected));
  }

  return typeof actual === "string"
    && typeof expected === "string"
    && actual.includes(expected);
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return Object.is(left, right);
}

function formatValue(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }

  return JSON.stringify(value);
}
