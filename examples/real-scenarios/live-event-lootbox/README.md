# Live Event Lootbox Scenario

This is the flagship practical scenario. It models a seasonal lootbox with:

- server-side authoritative context
- unique rewards per open
- event-featured item boosts
- class relevance boosts
- owned cosmetic duplicate drops
- reward cooldown drops
- legendary pity
- currency caps for high-balance players
- a separate guaranteed currency table
- explain and simulation steps in one scenario file

Run it with:

~~~bash
npm run os-probabilities -- scenario examples/real-scenarios/live-event-lootbox/scenario.yaml
~~~

The scenario is intentionally policy-only. A real game would store the policy version, seed, selected item IDs, and references to the player state used to build context.
