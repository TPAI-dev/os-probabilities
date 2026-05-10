import type { DataPath, SourceItem } from "./types.js";

const DATA_PATH_PATTERN = /^(ctx|item)\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/;

export function isDataPath(value: unknown): value is DataPath {
  return typeof value === "string" && DATA_PATH_PATTERN.test(value);
}

export function readDataPath(path: DataPath, context: unknown, item: SourceItem): unknown {
  const [rootName, ...segments] = path.split(".");
  let current: unknown = rootName === "ctx" ? context : item;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== "object") {
      return undefined;
    }

    const record = current as Record<string, unknown>;
    current = record[segment];
  }

  return current;
}
