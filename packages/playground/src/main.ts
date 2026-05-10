import { createEngine, validateSpec } from "@os-probabilities/core";
import type { ProbabilitySpec } from "@os-probabilities/core";
import "./styles.css";

const sampleSpec: ProbabilitySpec = {
  schemaVersion: "os-probabilities/v1",
  sources: {
    loot: {
      items: [
        { id: "coin_pack_small", name: "Small Coin Pack", rarity: "common", tags: ["currency", "guaranteed"], weight: 80 },
        { id: "crafting_shards", name: "Crafting Shards", rarity: "common", tags: ["currency"], weight: 50 },
        { id: "frost_blade", name: "Frost Blade", rarity: "rare", tags: ["weapon", "event", "frost"], weight: 12 },
        { id: "ember_wings", name: "Ember Wings", rarity: "epic", tags: ["cosmetic", "event", "fire"], weight: 6 },
        { id: "dragon_mount", name: "Dragon Mount", rarity: "legendary", tags: ["mount", "legendary"], weight: 1 },
        { id: "aurora_crown", name: "Aurora Crown", rarity: "legendary", tags: ["cosmetic", "legendary", "event"], weight: 0.8 }
      ]
    }
  },
  tables: {
    "lootbox.open": {
      source: "loot",
      draw: "sample_without_replacement",
      count: 3,
      constraints: { unique: true },
      weights: {
        base: { path: "item.weight", default: 1 },
        modifiers: [
          {
            id: "event_item_boost",
            kind: "multiply",
            factor: 2,
            when: [
              { path: "ctx.activeEvent", op: "equals", value: "frost_festival" },
              { path: "item.tags", op: "contains", value: "event" }
            ]
          },
          {
            id: "legendary_pity",
            kind: "pity",
            missPath: "ctx.legendaryMisses",
            increasePerMiss: 0.15,
            maxBonus: 5,
            when: [{ path: "item.rarity", op: "equals", value: "legendary" }]
          },
          {
            id: "duplicate_suppression",
            kind: "drop",
            when: [{ path: "ctx.ownedItems", op: "contains", valuePath: "item.id" }]
          },
          {
            id: "legendary_cap",
            kind: "clamp",
            max: 7,
            when: [{ path: "item.rarity", op: "equals", value: "legendary" }]
          }
        ]
      }
    }
  }
};

const sampleContext = {
  activeEvent: "frost_festival",
  legendaryMisses: 18,
  ownedItems: ["frost_blade"]
};

type OutputMode = "idle" | "success" | "error";

type OddsRow = {
  id: string;
  odds: number;
  finalWeight: string;
};

const state = {
  spec: JSON.stringify(sampleSpec, null, 2),
  context: JSON.stringify(sampleContext, null, 2),
  tableId: "lootbox.open",
  seed: "player-123:frost-box:open-0001",
  runs: "1000",
  output: "Run Validate, Explain, or Simulate to inspect the policy.",
  mode: "idle" as OutputMode,
  selectedIds: [] as string[],
  oddsRows: [] as OddsRow[]
};

const app = document.querySelector<HTMLDivElement>("#app");
if (app === null) {
  throw new Error("missing app root");
}

render();

function render(): void {
  app.innerHTML = `
    <header class="topbar">
      <div>
        <p class="eyebrow">OS Probabilities</p>
        <h1>Deterministic probability policies for real product decisions.</h1>
      </div>
      <nav class="links" aria-label="Project links">
        <a href="https://github.com/TPAI-dev/os-probabilities" target="_blank" rel="noreferrer">GitHub</a>
        <a href="https://github.com/TPAI-dev/os-probabilities/blob/main/docs/lootbox-quickstart.md" target="_blank" rel="noreferrer">Quickstart</a>
        <a href="https://github.com/TPAI-dev/os-probabilities/blob/main/docs/spec-v1.md" target="_blank" rel="noreferrer">Spec</a>
      </nav>
    </header>

    <main class="shell">
      <section class="intro" aria-label="What this playground demonstrates">
        <div>
          <h2>Lootbox policy playground</h2>
          <p>Edit the policy or context, then validate the config, replay one seeded open, or simulate balance across many opens.</p>
        </div>
        <dl class="metrics">
          <div><dt>Runtime</dt><dd>core</dd></div>
          <div><dt>RNG</dt><dd>PCG32</dd></div>
          <div><dt>Draw</dt><dd>unique x3</dd></div>
        </dl>
      </section>

      <section class="workspace">
        <div class="editor-panel">
          <div class="field-row">
            <label>Table ID<input id="tableId" value="${escapeHtml(state.tableId)}" /></label>
            <label>Seed<input id="seed" value="${escapeHtml(state.seed)}" /></label>
            <label>Runs<input id="runs" type="number" min="1" step="1" value="${escapeHtml(state.runs)}" /></label>
          </div>
          <label class="textarea-label">Policy JSON<textarea id="spec" spellcheck="false">${escapeHtml(state.spec)}</textarea></label>
          <label class="textarea-label">Context JSON<textarea id="context" spellcheck="false">${escapeHtml(state.context)}</textarea></label>
        </div>

        <div class="result-panel">
          <div class="toolbar" role="group" aria-label="Playground actions">
            <button id="validate" type="button">Validate</button>
            <button id="explain" type="button">Explain</button>
            <button id="simulate" type="button">Simulate</button>
          </div>
          ${renderSummary()}
          <pre class="output ${state.mode}" id="output" aria-live="polite">${escapeHtml(state.output)}</pre>
        </div>
      </section>

      <section class="guide" aria-label="Adoption guide">
        <article>
          <h2>Use this when</h2>
          <p>You need to validate, replay, explain, or simulate important random decisions instead of scattering weighted-random helpers across code.</p>
        </article>
        <article>
          <h2>Skip this when</h2>
          <p>You only need one tiny random choice and nobody will inspect the odds, reproduce a result, or tune the policy later.</p>
        </article>
        <article>
          <h2>Production shape</h2>
          <p>Run authoritative picks on the server, store the policy version and seed, and expose traces to support and QA tools.</p>
        </article>
      </section>
    </main>
  `;

  bindInputs();
  bindAction("validate", validatePolicy);
  bindAction("explain", explainPolicy);
  bindAction("simulate", simulatePolicy);
}

function renderSummary(): string {
  const selected = state.selectedIds.length === 0
    ? "No selection yet"
    : state.selectedIds.join(", ");
  const bars = state.oddsRows.length === 0
    ? "<p class=\"empty\">Explain a policy to see first-draw normalized odds.</p>"
    : state.oddsRows.map((row) => `
        <div class="odds-row">
          <div class="odds-label"><span>${escapeHtml(row.id)}</span><strong>${formatPercent(row.odds)}</strong></div>
          <div class="bar" aria-hidden="true"><span style="width: ${Math.max(2, row.odds * 100).toFixed(2)}%"></span></div>
          <small>final weight ${escapeHtml(row.finalWeight)}</small>
        </div>
      `).join("");

  return `
    <aside class="summary" aria-label="Result summary">
      <div>
        <span class="summary-label">Selected</span>
        <strong>${escapeHtml(selected)}</strong>
      </div>
      <div class="odds">
        <span class="summary-label">First draw odds</span>
        ${bars}
      </div>
    </aside>
  `;
}

function bindInputs(): void {
  bindInput("spec", (value) => { state.spec = value; });
  bindInput("context", (value) => { state.context = value; });
  bindInput("tableId", (value) => { state.tableId = value; });
  bindInput("seed", (value) => { state.seed = value; });
  bindInput("runs", (value) => { state.runs = value; });
}

function bindInput(id: string, update: (value: string) => void): void {
  const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>("#" + id);
  input?.addEventListener("input", () => update(input.value));
}

function bindAction(id: string, action: () => void): void {
  document.querySelector<HTMLButtonElement>("#" + id)?.addEventListener("click", () => {
    captureState();
    action();
    render();
  });
}

function captureState(): void {
  state.spec = getValue("spec");
  state.context = getValue("context");
  state.tableId = getValue("tableId");
  state.seed = getValue("seed");
  state.runs = getValue("runs");
}

function validatePolicy(): void {
  runSafely(() => {
    const result = validateSpec(readSpec());
    state.selectedIds = [];
    state.oddsRows = [];
    return result;
  });
}

function explainPolicy(): void {
  runSafely(() => {
    const result = createEngine(readSpec()).explain(state.tableId, readContext(), { seed: state.seed });
    state.selectedIds = result.selectedIds;
    state.oddsRows = result.trace.draws[0]?.candidates.map((candidate) => ({
      id: candidate.id,
      odds: candidate.finalOdds,
      finalWeight: candidate.finalWeight
    })) ?? [];
    return result;
  });
}

function simulatePolicy(): void {
  const runs = Number(state.runs);
  if (!Number.isInteger(runs) || runs < 1) {
    setError("Runs must be a positive integer.");
    return;
  }
  runSafely(() => {
    const result = createEngine(readSpec()).simulate(state.tableId, readContext(), { seed: state.seed, runs });
    state.selectedIds = result.topSelected.slice(0, 3).map((item) => item.id);
    state.oddsRows = result.topSelected.slice(0, 5).map((item) => ({
      id: item.id,
      odds: item.ratePerRun / Math.max(1, result.totalSelections / result.runs),
      finalWeight: String(item.count)
    }));
    return result;
  });
}

function runSafely(action: () => unknown): void {
  try {
    state.output = JSON.stringify(action(), null, 2);
    state.mode = "success";
  } catch (error) {
    setError(error instanceof Error ? error.message : String(error));
  }
}

function setError(message: string): void {
  state.output = message;
  state.mode = "error";
  state.selectedIds = [];
  state.oddsRows = [];
}

function readSpec(): ProbabilitySpec {
  return JSON.parse(state.spec) as ProbabilitySpec;
}

function readContext(): unknown {
  return JSON.parse(state.context);
}

function getValue(id: string): string {
  return document.querySelector<HTMLInputElement | HTMLTextAreaElement>("#" + id)?.value ?? "";
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(value < 0.01 ? 2 : 1) + "%";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
