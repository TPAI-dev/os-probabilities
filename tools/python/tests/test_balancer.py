from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from os_probabilities_balancer import compare_simulations, summarize_simulation


BASELINE = {
    "tableId": "combat.card_reward",
    "runs": 100,
    "totalSelections": 300,
    "selectionCounts": {
        "venom_strike": {"count": 60, "ratePerRun": 0.6},
        "quick_guard": {"count": 40, "ratePerRun": 0.4},
    },
    "tagFrequencies": {
        "poison": {"count": 60, "ratePerRun": 0.6},
    },
    "rarityFrequencies": {
        "rare": {"count": 10, "ratePerRun": 0.1},
    },
    "topSelected": [
        {"id": "venom_strike", "count": 60, "ratePerRun": 0.6},
    ],
}

CANDIDATE = {
    **BASELINE,
    "runs": 100,
    "selectionCounts": {
        "venom_strike": {"count": 80, "ratePerRun": 0.8},
        "quick_guard": {"count": 20, "ratePerRun": 0.2},
    },
    "tagFrequencies": {
        "poison": {"count": 80, "ratePerRun": 0.8},
    },
}


class BalancerTests(unittest.TestCase):
    def test_summarizes_simulation_output(self) -> None:
        summary = summarize_simulation(BASELINE)

        self.assertEqual(summary.table_id, "combat.card_reward")
        self.assertEqual(summary.runs, 100)
        self.assertEqual(summary.rarity_rates["rare"], 0.1)
        self.assertEqual(summary.tag_rates["poison"], 0.6)

    def test_compares_rate_changes_above_threshold(self) -> None:
        comparison = compare_simulations(BASELINE, CANDIDATE, threshold=0.15)

        self.assertTrue(comparison["changed"])
        self.assertEqual(comparison["tableId"], "combat.card_reward")
        self.assertEqual(
            [delta["id"] for delta in comparison["itemDeltas"]],
            ["quick_guard", "venom_strike"],
        )


if __name__ == "__main__":
    unittest.main()
