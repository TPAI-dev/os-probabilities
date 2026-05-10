import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createEngine } from "./engine.js";
import type { ProbabilitySpec } from "./types.js";

interface RuntimeCase {
  id: string;
  tableId: string;
  seed: string;
  simulationRuns: number;
  context: unknown;
  spec: ProbabilitySpec;
  expected: {
    selectedIds: string[];
    trace: unknown;
    simulation: unknown;
  };
}

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/determinism/runtime-cases.json", import.meta.url), "utf8")
) as { schemaVersion: string; cases: RuntimeCase[] };

describe("runtime determinism fixtures", () => {
  it("uses the v1 schema fixture corpus", () => {
    expect(fixture.schemaVersion).toBe("os-probabilities/v1");
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  for (const testCase of fixture.cases) {
    it(`matches fixture case ${testCase.id}`, () => {
      const engine = createEngine(testCase.spec);
      const explanation = engine.explain(testCase.tableId, testCase.context, { seed: testCase.seed });
      const simulation = engine.simulate(testCase.tableId, testCase.context, {
        seed: testCase.seed,
        runs: testCase.simulationRuns
      });

      expect(explanation.selectedIds).toEqual(testCase.expected.selectedIds);
      expect(explanation.trace).toEqual(testCase.expected.trace);
      expect(simulation).toEqual(testCase.expected.simulation);
    });
  }
});
