from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class BalanceSummary:
    table_id: str
    runs: int
    total_selections: int
    top_selected: list[dict[str, Any]]
    rarity_rates: dict[str, float]
    tag_rates: dict[str, float]


def summarize_simulation(simulation: dict[str, Any]) -> BalanceSummary:
    return BalanceSummary(
        table_id=str(simulation["tableId"]),
        runs=int(simulation["runs"]),
        total_selections=int(simulation["totalSelections"]),
        top_selected=list(simulation.get("topSelected", [])),
        rarity_rates=_rates(simulation.get("rarityFrequencies", {})),
        tag_rates=_rates(simulation.get("tagFrequencies", {})),
    )


def compare_simulations(
    baseline: dict[str, Any],
    candidate: dict[str, Any],
    *,
    threshold: float = 0.05,
) -> dict[str, Any]:
    baseline_summary = summarize_simulation(baseline)
    candidate_summary = summarize_simulation(candidate)
    item_deltas = _deltas(
        baseline.get("selectionCounts", {}),
        candidate.get("selectionCounts", {}),
        threshold,
    )
    rarity_deltas = _deltas(
        baseline.get("rarityFrequencies", {}),
        candidate.get("rarityFrequencies", {}),
        threshold,
    )
    tag_deltas = _deltas(
        baseline.get("tagFrequencies", {}),
        candidate.get("tagFrequencies", {}),
        threshold,
    )

    return {
        "tableId": candidate_summary.table_id,
        "baselineRuns": baseline_summary.runs,
        "candidateRuns": candidate_summary.runs,
        "threshold": threshold,
        "itemDeltas": item_deltas,
        "rarityDeltas": rarity_deltas,
        "tagDeltas": tag_deltas,
        "changed": bool(item_deltas or rarity_deltas or tag_deltas),
    }


def _rates(counts: dict[str, Any]) -> dict[str, float]:
    return {
        key: float(value.get("ratePerRun", 0))
        for key, value in counts.items()
        if isinstance(value, dict)
    }


def _deltas(
    baseline_counts: dict[str, Any],
    candidate_counts: dict[str, Any],
    threshold: float,
) -> list[dict[str, Any]]:
    keys = sorted(set(baseline_counts) | set(candidate_counts))
    deltas: list[dict[str, Any]] = []
    for key in keys:
        baseline_rate = _rate_for_key(baseline_counts, key)
        candidate_rate = _rate_for_key(candidate_counts, key)
        delta = candidate_rate - baseline_rate
        if abs(delta) >= threshold:
            deltas.append(
                {
                    "id": key,
                    "baselineRatePerRun": baseline_rate,
                    "candidateRatePerRun": candidate_rate,
                    "deltaRatePerRun": delta,
                }
            )
    return deltas


def _rate_for_key(counts: dict[str, Any], key: str) -> float:
    value = counts.get(key)
    if not isinstance(value, dict):
        return 0.0
    return float(value.get("ratePerRun", 0))
