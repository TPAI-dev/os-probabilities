# Unity Server-Authoritative Contract

Unity should call a backend that runs OS Probabilities. The client should not compute durable lootbox outcomes locally.

Request:

~~~json
{
  "boxId": "frost-box",
  "openId": "open-9001"
}
~~~

Response:

~~~json
{
  "itemIds": ["ranger_bow", "coins_500", "dragon_mount"],
  "seed": "lootbox:player-42:frost-box:open-9001",
  "policyVersion": "lootbox-frost-v1"
}
~~~

Backend responsibilities:

- authenticate the player
- reconstruct inventory, pity counters, event state, and eligibility server-side
- execute `lootbox.open`
- persist selected IDs, seed, policy version, and context references
- return only player-facing reward data to Unity
