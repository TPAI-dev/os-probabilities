# Production Integration Examples

These examples show production integration shapes without adding server framework dependencies.

- [node-lootbox-server.ts](node-lootbox-server.ts): authoritative server-side lootbox open
- [support-explain.ts](support-explain.ts): support/audit explanation lookup
- [feature-rollout.ts](feature-rollout.ts): deterministic local feature routing
- [browser-policy-preview.ts](browser-policy-preview.ts): browser-side validation and explanation preview
- [python-balancing-workflow.md](python-balancing-workflow.md): simulation comparison flow with Python tools
- [unity-server-contract.md](unity-server-contract.md): Unity client/server contract
- [godot-server-contract.md](godot-server-contract.md): Godot client/server contract

The examples assume policy JSON is loaded from your deployment artifact and authoritative context is reconstructed from trusted server-side state.
