# When Not To Use OS Probabilities

OS Probabilities is not meant to replace every random call.

Use a tiny helper instead when:

- you only need to choose one item from a short list
- nobody needs to inspect or approve the odds
- replaying a result from a seed does not matter
- the selection logic will never be shared across a server, tool, test, or client
- simulation and balancing would be unnecessary ceremony

Use OS Probabilities when the random decision is part of product behavior:

- lootboxes, loot tables, card rewards, procedural rewards, matchmaking buckets, or product routing
- probability rules owned by designers or operators rather than buried in code
- support needs to explain why a player/user got a specific result
- teams need to simulate odds before shipping
- multiple runtimes need the same deterministic result
- bad configs should fail validation before deployment

The design target is not "more random." The design target is random behavior that can be declared, reviewed, tested, replayed, explained, and ported.

