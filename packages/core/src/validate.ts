import { DRAW_KINDS, PREDICATE_OPERATORS, SCHEMA_VERSION } from "./constants.js";
import { parseDecimal } from "./decimal.js";
import { isDataPath } from "./paths.js";
import type {
  DrawKind,
  Predicate,
  TableSpec,
  ValidationIssue,
  ValidationResult,
  WeightSpec
} from "./types.js";

const TABLE_ID_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export function validateSpec(spec: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!isRecord(spec)) {
    return issueResult("spec", "expected an object");
  }

  if (spec["schemaVersion"] !== SCHEMA_VERSION) {
    errors.push({
      path: "schemaVersion",
      message: `expected ${SCHEMA_VERSION}`
    });
  }

  const sources = spec["sources"];
  if (!isRecord(sources)) {
    errors.push({ path: "sources", message: "expected an object" });
  } else {
    validateSources(sources, errors);
  }

  const tables = spec["tables"];
  if (!isRecord(tables)) {
    errors.push({ path: "tables", message: "expected an object" });
  } else {
    validateTables(tables, isRecord(sources) ? sources : {}, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function issueResult(path: string, message: string): ValidationResult {
  return {
    valid: false,
    errors: [{ path, message }],
    warnings: []
  };
}

function validateSources(sources: Record<string, unknown>, errors: ValidationIssue[]): void {
  for (const [sourceId, source] of Object.entries(sources)) {
    const sourcePath = `sources.${sourceId}`;
    if (!TABLE_ID_PATTERN.test(sourceId)) {
      errors.push({ path: sourcePath, message: "source id must be lowercase dot/dash/underscore separated" });
    }

    if (!isRecord(source)) {
      errors.push({ path: sourcePath, message: "expected an object" });
      continue;
    }

    const items = source["items"];
    if (!Array.isArray(items)) {
      errors.push({ path: `${sourcePath}.items`, message: "expected an array" });
      continue;
    }

    const seenIds = new Set<string>();
    items.forEach((item, index) => {
      const itemPath = `${sourcePath}.items.${index}`;
      if (!isRecord(item)) {
        errors.push({ path: itemPath, message: "expected an object" });
        return;
      }

      const id = item["id"];
      if (typeof id !== "string" || id.length === 0) {
        errors.push({ path: `${itemPath}.id`, message: "expected a non-empty string" });
      } else if (seenIds.has(id)) {
        errors.push({ path: `${itemPath}.id`, message: `duplicate item id ${id}` });
      } else {
        seenIds.add(id);
      }

      validateOptionalDecimal(item["weight"], `${itemPath}.weight`, errors, false);

      const tags = item["tags"];
      if (tags !== undefined && (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string"))) {
        errors.push({ path: `${itemPath}.tags`, message: "expected an array of strings" });
      }
    });
  }
}

function validateTables(
  tables: Record<string, unknown>,
  sources: Record<string, unknown>,
  errors: ValidationIssue[]
): void {
  for (const [tableId, table] of Object.entries(tables)) {
    const tablePath = `tables.${tableId}`;
    if (!TABLE_ID_PATTERN.test(tableId)) {
      errors.push({ path: tablePath, message: "table id must be lowercase dot/dash/underscore separated" });
    }

    if (!isRecord(table)) {
      errors.push({ path: tablePath, message: "expected an object" });
      continue;
    }

    const source = table["source"];
    if (typeof source !== "string") {
      errors.push({ path: `${tablePath}.source`, message: "expected a source id string" });
    } else if (sources[source] === undefined) {
      errors.push({ path: `${tablePath}.source`, message: `unknown source ${source}` });
    }

    const draw = table["draw"];
    if (!isDrawKind(draw)) {
      errors.push({ path: `${tablePath}.draw`, message: `expected one of ${DRAW_KINDS.join(", ")}` });
    }

    validateCount(table as Partial<TableSpec>, tablePath, errors);
    validatePredicates(table["eligibility"], `${tablePath}.eligibility`, errors);
    validateWeights(table["weights"], `${tablePath}.weights`, errors);
    validateConstraints(table["constraints"], `${tablePath}.constraints`, errors);
    validateObviousZeroWeightTable(table as Partial<TableSpec>, tablePath, errors);
  }
}

function validateCount(table: Partial<TableSpec>, tablePath: string, errors: ValidationIssue[]): void {
  const count = table.count;
  if (count !== undefined && (!Number.isInteger(count) || count < 1)) {
    errors.push({ path: `${tablePath}.count`, message: "expected a positive integer" });
  }

  if (table.draw === "weighted_choice" && count !== undefined && count !== 1) {
    errors.push({ path: `${tablePath}.count`, message: "weighted_choice count must be omitted or 1" });
  }

  if ((table.draw === "sample_with_replacement" || table.draw === "sample_without_replacement") && count === undefined) {
    errors.push({ path: `${tablePath}.count`, message: `${table.draw} requires count` });
  }
}

function validatePredicates(value: unknown, path: string, errors: ValidationIssue[]): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    errors.push({ path, message: "expected an array" });
    return;
  }

  value.forEach((predicate, index) => validatePredicate(predicate, `${path}.${index}`, errors));
}

function validatePredicate(value: unknown, path: string, errors: ValidationIssue[]): void {
  if (!isRecord(value)) {
    errors.push({ path, message: "expected an object" });
    return;
  }

  if (!isDataPath(value["path"])) {
    errors.push({ path: `${path}.path`, message: "expected a ctx.* or item.* path" });
  }

  if (!PREDICATE_OPERATORS.includes(value["op"] as Predicate["op"])) {
    errors.push({ path: `${path}.op`, message: `expected one of ${PREDICATE_OPERATORS.join(", ")}` });
  }

  if (value["value"] !== undefined && value["valuePath"] !== undefined) {
    errors.push({ path, message: "use value or valuePath, not both" });
  }

  if (value["valuePath"] !== undefined && !isDataPath(value["valuePath"])) {
    errors.push({ path: `${path}.valuePath`, message: "expected a ctx.* or item.* path" });
  }
}

function validateWeights(value: unknown, path: string, errors: ValidationIssue[]): void {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    errors.push({ path, message: "expected an object" });
    return;
  }

  validateBase(value["base"], `${path}.base`, errors);

  const modifiers = value["modifiers"];
  if (modifiers === undefined) {
    return;
  }

  if (!Array.isArray(modifiers)) {
    errors.push({ path: `${path}.modifiers`, message: "expected an array" });
    return;
  }

  modifiers.forEach((modifier, index) => validateModifier(modifier, `${path}.modifiers.${index}`, errors));
}

function validateBase(value: unknown, path: string, errors: ValidationIssue[]): void {
  if (value === undefined) {
    return;
  }

  if (typeof value === "number" || typeof value === "string") {
    validateOptionalDecimal(value, path, errors, false);
    return;
  }

  if (!isRecord(value)) {
    errors.push({ path, message: "expected a decimal or base object" });
    return;
  }

  if (value["path"] !== undefined && !isDataPath(value["path"])) {
    errors.push({ path: `${path}.path`, message: "expected a ctx.* or item.* path" });
  }

  validateOptionalDecimal(value["value"], `${path}.value`, errors, false);
  validateOptionalDecimal(value["default"], `${path}.default`, errors, false);

  if (value["path"] === undefined && value["value"] === undefined) {
    errors.push({ path, message: "base object requires path or value" });
  }
}

function validateModifier(value: unknown, path: string, errors: ValidationIssue[]): void {
  if (!isRecord(value)) {
    errors.push({ path, message: "expected an object" });
    return;
  }

  if (typeof value["id"] !== "string" || value["id"].length === 0) {
    errors.push({ path: `${path}.id`, message: "expected a non-empty string" });
  }

  validatePredicates(value["when"], `${path}.when`, errors);

  const kind = value["kind"];
  if (kind === "multiply") {
    validateOptionalDecimal(value["factor"], `${path}.factor`, errors, false);
    return;
  }

  if (kind === "add") {
    validateOptionalDecimal(value["value"], `${path}.value`, errors, false);
    return;
  }

  if (kind === "pity") {
    if (!isDataPath(value["missPath"])) {
      errors.push({ path: `${path}.missPath`, message: "expected a ctx.* or item.* path" });
    }
    validateOptionalDecimal(value["increasePerMiss"], `${path}.increasePerMiss`, errors, false);
    validateOptionalDecimal(value["maxBonus"], `${path}.maxBonus`, errors, false);
    return;
  }

  if (kind === "set") {
    validateOptionalDecimal(value["value"], `${path}.value`, errors, false);
    return;
  }

  if (kind === "clamp") {
    validateOptionalDecimal(value["min"], `${path}.min`, errors, false);
    validateOptionalDecimal(value["max"], `${path}.max`, errors, false);
    if (value["min"] === undefined && value["max"] === undefined) {
      errors.push({ path, message: "clamp requires min or max" });
    }
    return;
  }

  if (kind === "drop") {
    return;
  }

  errors.push({ path: `${path}.kind`, message: "expected multiply, add, pity, set, clamp, or drop" });
}

function validateConstraints(value: unknown, path: string, errors: ValidationIssue[]): void {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    errors.push({ path, message: "expected an object" });
    return;
  }

  if (value["unique"] !== undefined && typeof value["unique"] !== "boolean") {
    errors.push({ path: `${path}.unique`, message: "expected a boolean" });
  }
}

function validateObviousZeroWeightTable(table: Partial<TableSpec>, tablePath: string, errors: ValidationIssue[]): void {
  const weights = table.weights as WeightSpec | undefined;
  const base = weights?.base;
  const modifiers = weights?.modifiers;

  if (modifiers !== undefined && modifiers.length > 0) {
    return;
  }

  if (base === 0 || base === "0") {
    errors.push({
      path: `${tablePath}.weights.base`,
      message: "table has an obvious zero total weight"
    });
  }
}

function validateOptionalDecimal(
  value: unknown,
  path: string,
  errors: ValidationIssue[],
  allowNegative: boolean
): void {
  if (value === undefined) {
    return;
  }

  const parsed = parseDecimal(value);
  if (!parsed.ok) {
    errors.push({ path, message: parsed.message });
    return;
  }

  if (!allowNegative && parsed.value < 0n) {
    errors.push({ path, message: "expected a non-negative decimal" });
  }
}

function isDrawKind(value: unknown): value is DrawKind {
  return DRAW_KINDS.includes(value as DrawKind);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
