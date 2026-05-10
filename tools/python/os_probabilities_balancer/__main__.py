from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .analysis import compare_simulations, summarize_simulation


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="os-probabilities-balance")
    subparsers = parser.add_subparsers(dest="command", required=True)

    summarize = subparsers.add_parser("summarize")
    summarize.add_argument("simulation_json")

    compare = subparsers.add_parser("compare")
    compare.add_argument("baseline_json")
    compare.add_argument("candidate_json")
    compare.add_argument("--threshold", type=float, default=0.05)

    args = parser.parse_args(argv)
    if args.command == "summarize":
        simulation = _read_json(args.simulation_json)
        summary = summarize_simulation(simulation)
        print(json.dumps(summary.__dict__, indent=2, sort_keys=True))
        return 0

    baseline = _read_json(args.baseline_json)
    candidate = _read_json(args.candidate_json)
    print(json.dumps(compare_simulations(baseline, candidate, threshold=args.threshold), indent=2, sort_keys=True))
    return 0


def _read_json(path: str) -> dict[str, object]:
    value = json.loads(Path(path).read_text())
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


if __name__ == "__main__":
    sys.exit(main())
