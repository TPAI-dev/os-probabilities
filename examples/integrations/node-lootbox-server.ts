import { createEngine } from "@os-probabilities/core";
import { createLootboxAdapter } from "@os-probabilities/adapters";
import type { ProbabilitySpec } from "@os-probabilities/core";

export interface LootboxOpenRequest {
  playerId: string;
  boxId: string;
  openId: string;
}

export interface PlayerLootboxState {
  activeEvent?: string;
  legendaryMisses: number;
  ownedItems: string[];
}

export function createLootboxService(policy: ProbabilitySpec) {
  const engine = createEngine(policy);
  const lootbox = createLootboxAdapter(engine, { tableId: "lootbox.open" });

  return {
    open(request: LootboxOpenRequest, state: PlayerLootboxState) {
      return lootbox.open(
        {
          activeEvent: state.activeEvent,
          legendaryMisses: state.legendaryMisses,
          ownedItems: state.ownedItems
        },
        {
          playerId: request.playerId,
          boxId: request.boxId,
          openId: request.openId,
          trace: true
        }
      );
    }
  };
}

