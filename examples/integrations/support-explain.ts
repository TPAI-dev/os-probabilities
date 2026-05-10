import { createEngine } from "@os-probabilities/core";
import type { ProbabilitySpec } from "@os-probabilities/core";

export function explainLootboxOpen(input: {
  policy: ProbabilitySpec;
  context: unknown;
  seed: string;
}) {
  const engine = createEngine(input.policy);
  return engine.explain("lootbox.open", input.context, { seed: input.seed });
}

