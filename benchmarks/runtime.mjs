import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { createEngine } from "../packages/core/dist/index.js";

const policy = {
  schemaVersion: "os-probabilities/v1",
  sources: {
    loot: {
      items: [
        { id: "coin_pack_small", rarity: "common", tags: ["currency", "guaranteed"], weight: 80 },
        { id: "crafting_shards", rarity: "common", tags: ["currency"], weight: 50 },
        { id: "frost_blade", rarity: "rare", tags: ["weapon", "event", "frost"], weight: 12 },
        { id: "ember_wings", rarity: "epic", tags: ["cosmetic", "event", "fire"], weight: 6 },
        { id: "dragon_mount", rarity: "legendary", tags: ["mount", "legendary"], weight: 1 },
        { id: "aurora_crown", rarity: "legendary", tags: ["cosmetic", "legendary", "event"], weight: 0.8 }
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

const context = {
  activeEvent: "frost_festival",
  legendaryMisses: 18,
  ownedItems: ["frost_blade"]
};

const engine = createEngine(policy);

function measure(label, iterations, action) {
  for (let index = 0; index < Math.min(iterations, 1000); index += 1) {
    action(index);
  }
  const started = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    action(index);
  }
  const elapsedMs = performance.now() - started;
  return {
    label,
    iterations,
    elapsedMs: Number(elapsedMs.toFixed(3)),
    opsPerSecond: Math.round((iterations / elapsedMs) * 1000)
  };
}

const results = [
  measure("pick lootbox.open", 100000, (index) => {
    engine.pick("lootbox.open", context, { seed: "bench-" + index });
  }),
  measure("explain lootbox.open", 10000, (index) => {
    engine.explain("lootbox.open", context, { seed: "bench-" + index });
  }),
  measure("simulate lootbox.open 1000 runs", 25, (index) => {
    engine.simulate("lootbox.open", context, { seed: "bench-sim-" + index, runs: 1000 });
  })
];

const output = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  policy: "examples/lootbox/prob.yaml equivalent embedded benchmark policy",
  results,
  notes: [
    "Numbers are local smoke benchmarks, not a formal performance guarantee.",
    "Run npm run build before running this script so dist files exist."
  ]
};

const writeIndex = process.argv.indexOf("--write");
if (writeIndex !== -1) {
  const target = process.argv[writeIndex + 1] ?? "benchmarks/latest.json";
  writeFileSync(target, JSON.stringify(output, null, 2) + "\n");
}

console.log(JSON.stringify(output, null, 2));

