#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { runScenario } from "@os-probabilities/adapters";
import type { DecisionScenario } from "@os-probabilities/adapters";
import {
  ProbabilityRuntimeError,
  ProbabilityValidationError,
  createEngine,
  validateSpec
} from "@os-probabilities/core";
import type { ProbabilitySpec } from "@os-probabilities/core";
import { parse as parseYaml } from "yaml";

interface CliIo {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
}

type Command = "validate" | "pick" | "explain" | "simulate" | "scenario";

const usage = `Usage:
  os-probabilities validate <config>
  os-probabilities pick <tableId> --config <config> --context <context> --seed <seed> [--trace]
  os-probabilities explain <tableId> --config <config> --context <context> --seed <seed>
  os-probabilities simulate <tableId> --config <config> --context <context> --seed <seed> --runs <n>
  os-probabilities scenario <scenario>`;

export async function main(
  argv: string[] = process.argv.slice(2),
  io: CliIo = { stdout: process.stdout, stderr: process.stderr }
): Promise<number> {
  try {
    await run(argv, io);
    return 0;
  } catch (error) {
    io.stderr.write(`${formatError(error)}\n`);
    return 1;
  }
}

async function run(argv: string[], io: CliIo): Promise<void> {
  const [commandRaw, ...args] = argv;

  if (commandRaw === undefined || commandRaw === "--help" || commandRaw === "-h") {
    io.stdout.write(`${usage}\n`);
    return;
  }

  if (!isCommand(commandRaw)) {
    throw new CliError(`unknown command ${commandRaw}\n\n${usage}`);
  }

  if (commandRaw === "validate") {
    await validateCommand(args, io);
    return;
  }

  if (commandRaw === "scenario") {
    await scenarioCommand(args, io);
    return;
  }

  const parsed = parseArgs({
    args,
    allowPositionals: true,
    options: {
      config: { type: "string" },
      context: { type: "string" },
      seed: { type: "string" },
      runs: { type: "string" },
      trace: { type: "boolean", default: false }
    }
  });

  const [tableId] = parsed.positionals;
  if (tableId === undefined) {
    throw new CliError(`${commandRaw} requires a table id`);
  }

  const configPath = requireStringOption(parsed.values.config, "--config");
  const contextPath = requireStringOption(parsed.values.context, "--context");
  const seed = requireStringOption(parsed.values.seed, "--seed");
  const spec = await readSpec(configPath);
  const context = await readDataFile(contextPath);
  const engine = createEngine(spec);

  if (commandRaw === "pick") {
    const result = engine.pick(tableId, context, {
      seed,
      trace: parsed.values.trace === true
    });
    writeJson(io, result);
    return;
  }

  if (commandRaw === "explain") {
    const result = engine.explain(tableId, context, { seed });
    writeJson(io, result);
    return;
  }

  const runsRaw = requireStringOption(parsed.values.runs, "--runs");
  const runs = Number(runsRaw);
  if (!Number.isInteger(runs) || runs < 1) {
    throw new CliError("--runs must be a positive integer");
  }

  const result = engine.simulate(tableId, context, { seed, runs });
  writeJson(io, result);
}

async function validateCommand(args: string[], io: CliIo): Promise<void> {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    options: {}
  });
  const [configPath] = parsed.positionals;

  if (configPath === undefined) {
    throw new CliError("validate requires a config path");
  }

  const spec = await readDataFile(configPath);
  const result = validateSpec(spec);
  writeJson(io, result);

  if (!result.valid) {
    throw new CliError("policy validation failed");
  }
}

async function scenarioCommand(args: string[], io: CliIo): Promise<void> {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    options: {}
  });
  const [scenarioPath] = parsed.positionals;

  if (scenarioPath === undefined) {
    throw new CliError("scenario requires a scenario file path");
  }

  const scenario = await readDataFile(scenarioPath);
  assertScenario(scenario);
  writeJson(io, runScenario(scenario));
}

async function readSpec(path: string): Promise<ProbabilitySpec> {
  const spec = await readDataFile(path);
  const result = validateSpec(spec);
  if (!result.valid) {
    throw new ProbabilityValidationError(result.errors);
  }
  return spec as ProbabilitySpec;
}

async function readDataFile(path: string): Promise<unknown> {
  const content = await readFile(path, "utf8");
  const extension = extname(path).toLowerCase();

  if (extension === ".yaml" || extension === ".yml") {
    return parseYaml(content);
  }

  if (extension === ".json") {
    return JSON.parse(content);
  }

  throw new CliError(`unsupported file extension for ${path}; expected .json, .yaml, or .yml`);
}

function assertScenario(value: unknown): asserts value is DecisionScenario {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CliError("scenario must be an object");
  }

  const scenario = value as Partial<DecisionScenario>;
  if (typeof scenario.id !== "string" || scenario.id.length === 0) {
    throw new CliError("scenario.id must be a non-empty string");
  }

  if (scenario.spec === undefined) {
    throw new CliError("scenario.spec is required");
  }

  const validation = validateSpec(scenario.spec);
  if (!validation.valid) {
    throw new ProbabilityValidationError(validation.errors);
  }

  if (!Array.isArray(scenario.steps) || scenario.steps.length === 0) {
    throw new CliError("scenario.steps must be a non-empty array");
  }
}

function requireStringOption(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new CliError(`${name} is required`);
  }
  return value;
}

function writeJson(io: CliIo, value: unknown): void {
  io.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function isCommand(value: string): value is Command {
  return value === "validate" || value === "pick" || value === "explain" || value === "simulate" || value === "scenario";
}

function formatError(error: unknown): string {
  if (error instanceof CliError || error instanceof ProbabilityRuntimeError || error instanceof ProbabilityValidationError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

class CliError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  process.exitCode = await main();
}
