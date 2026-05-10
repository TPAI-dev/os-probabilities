# Python Balancing Workflow Example

Generate simulation JSON with the CLI, then compare runs with the Python tool.

~~~bash
npm run os-probabilities -- simulate lootbox.open   --config examples/lootbox/prob.yaml   --context examples/lootbox/frost-player.json   --seed frost-box-baseline   --runs 100000 > baseline.json

npm run os-probabilities -- simulate lootbox.open   --config examples/lootbox/prob.yaml   --context examples/lootbox/frost-player.json   --seed frost-box-candidate   --runs 100000 > candidate.json

PYTHONPATH=tools/python python3 -m os_probabilities_balancer compare baseline.json candidate.json --threshold 0.02
~~~
