import { createEngine, validateSpec } from "@os-probabilities/core";
import type { ProbabilitySpec } from "@os-probabilities/core";

export function previewPolicy(input: {
  policy: ProbabilitySpec;
  tableId: string;
  context: unknown;
  seed: string;
}) {
  const validation = validateSpec(input.policy);
  if (!validation.valid) {
    return { validation };
  }

  const engine = createEngine(input.policy);
  return {
    validation,
    explanation: engine.explain(input.tableId, input.context, { seed: input.seed })
  };
}
