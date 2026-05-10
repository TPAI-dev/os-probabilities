# Python Balancing Workflow

The Python package in `tools/python` is intentionally small. It analyzes simulation JSON produced by the TypeScript runtime instead of reimplementing the full policy engine.

## Generate Simulation Outputs

~~~bash
npm run os-probabilities -- simulate lootbox.open   --config examples/lootbox/prob.yaml   --context examples/lootbox/frost-player.json   --seed frost-box-baseline   --runs 100000 > baseline.json

npm run os-probabilities -- simulate lootbox.open   --config examples/lootbox/prob.yaml   --context examples/lootbox/frost-player.json   --seed frost-box-candidate   --runs 100000 > candidate.json
~~~

## Summarize

~~~bash
PYTHONPATH=tools/python python3 -m os_probabilities_balancer summarize baseline.json
~~~

## Compare

~~~bash
PYTHONPATH=tools/python python3 -m os_probabilities_balancer compare baseline.json candidate.json --threshold 0.02
~~~

The comparison reports item, rarity, and tag rate changes above the threshold. That makes it suitable for balance review in notebooks, CI jobs, or release checks without making Python an authoritative runtime yet.
