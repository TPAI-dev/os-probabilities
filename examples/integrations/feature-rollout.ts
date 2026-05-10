import { createEngine } from "@os-probabilities/core";
import { createFeatureRolloutAdapter } from "@os-probabilities/adapters";
import type { ProbabilitySpec } from "@os-probabilities/core";

export function createCheckoutRollout(policy: ProbabilitySpec) {
  const engine = createEngine(policy);
  const rollout = createFeatureRolloutAdapter(engine, {
    tableId: "checkout.variant",
    seedPrefix: "checkout-v2"
  });

  return {
    assign(accountId: string, context: unknown) {
      return rollout.assign(context, { entityId: accountId, trace: true });
    }
  };
}

