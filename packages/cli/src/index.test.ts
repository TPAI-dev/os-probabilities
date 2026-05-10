import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { main } from "./index.js";

const slayConfig = fileURLToPath(new URL("../../../examples/slay-like-card-rewards/prob.yaml", import.meta.url));
const slayContext = fileURLToPath(new URL("../../../examples/slay-like-card-rewards/silent-poison.json", import.meta.url));
const deckbuilderScenario = fileURLToPath(new URL("../../../examples/real-scenarios/deckbuilder-act-run/scenario.yaml", import.meta.url));
const lootboxScenario = fileURLToPath(new URL("../../../examples/real-scenarios/lootbox-pity-event/scenario.yaml", import.meta.url));

describe("CLI", () => {
  it("validates an example policy", async () => {
    const io = createIo();
    const code = await main(["validate", slayConfig], io);

    expect(code).toBe(0);
    expect(JSON.parse(io.stdoutText())).toMatchObject({ valid: true });
    expect(io.stderrText()).toBe("");
  });

  it("picks with trace output", async () => {
    const io = createIo();
    const code = await main([
      "pick",
      "combat.card_reward",
      "--config",
      slayConfig,
      "--context",
      slayContext,
      "--seed",
      "run-001",
      "--trace"
    ], io);

    const output = JSON.parse(io.stdoutText()) as { selectedIds: string[]; trace: unknown };
    expect(code).toBe(0);
    expect(output.selectedIds).toHaveLength(3);
    expect(output.trace).toBeDefined();
  });

  it("explains and simulates an example policy", async () => {
    const explainIo = createIo();
    const explainCode = await main([
      "explain",
      "combat.card_reward",
      "--config",
      slayConfig,
      "--context",
      slayContext,
      "--seed",
      "run-001"
    ], explainIo);

    const simulateIo = createIo();
    const simulateCode = await main([
      "simulate",
      "combat.card_reward",
      "--config",
      slayConfig,
      "--context",
      slayContext,
      "--seed",
      "run-001",
      "--runs",
      "10"
    ], simulateIo);

    expect(explainCode).toBe(0);
    expect(JSON.parse(explainIo.stdoutText())).toHaveProperty("trace");
    expect(simulateCode).toBe(0);
    expect(JSON.parse(simulateIo.stdoutText())).toMatchObject({
      tableId: "combat.card_reward",
      runs: 10,
      totalSelections: 30
    });
  });

  it("runs a complete real scenario", async () => {
    const io = createIo();
    const code = await main(["scenario", deckbuilderScenario], io);
    const output = JSON.parse(io.stdoutText()) as { id: string; steps: Array<{ id: string; mode: string }> };

    expect(code).toBe(0);
    expect(output.id).toBe("deckbuilder-act-run");
    expect(output.steps.map((step) => step.id)).toEqual([
      "floor_03_card_reward",
      "floor_08_poison_reward_simulation",
      "floor_10_shop_inventory",
      "floor_12_elite_relic"
    ]);
    expect(output.steps.some((step) => step.mode === "simulate")).toBe(true);
  });


  it("runs the lootbox pity/event scenario", async () => {
    const io = createIo();
    const code = await main(["scenario", lootboxScenario], io);
    const output = JSON.parse(io.stdoutText()) as { id: string; steps: Array<{ id: string; mode: string }> };

    expect(code).toBe(0);
    expect(output.id).toBe("lootbox-pity-event");
    expect(output.steps.map((step) => step.id)).toEqual([
      "validate_player_open_explain",
      "guaranteed_currency_explain",
      "balance_1000_opens"
    ]);
  });

});

function createIo(): {
  stdout: { write(chunk: string): true };
  stderr: { write(chunk: string): true };
  stdoutText(): string;
  stderrText(): string;
} {
  let stdout = "";
  let stderr = "";

  return {
    stdout: {
      write(chunk: string) {
        stdout += chunk;
        return true;
      }
    },
    stderr: {
      write(chunk: string) {
        stderr += chunk;
        return true;
      }
    },
    stdoutText() {
      return stdout;
    },
    stderrText() {
      return stderr;
    }
  };
}
