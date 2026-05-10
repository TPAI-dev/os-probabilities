# Production Integration Examples

These examples show the shape of production integrations without adding server framework dependencies.

- [node-lootbox-server.ts](node-lootbox-server.ts): authoritative server-side lootbox open
- [support-explain.ts](support-explain.ts): support/audit explanation lookup
- [feature-rollout.ts](feature-rollout.ts): deterministic local feature routing

The examples assume policy JSON is loaded from your deployment artifact and authoritative context is reconstructed from trusted server-side state.

