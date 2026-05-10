# @os-probabilities/core

Dependency-free TypeScript runtime for OS Probabilities policies.

```bash
npm install @os-probabilities/core
```

```ts
import { createEngine, validateSpec } from "@os-probabilities/core";

const validation = validateSpec(policy);
if (!validation.valid) throw new Error(validation.errors[0]?.message);

const engine = createEngine(policy);
const result = engine.explain("lootbox.open", context, { seed: "player-123:box-1:open-1" });
```

Docs: https://github.com/TPAI-dev/os-probabilities#readme

