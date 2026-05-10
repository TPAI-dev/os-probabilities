# Game Engine Integration

For Unity, Godot, Unreal, or custom clients, the safest production model is server-authoritative.

## Recommended Architecture

1. The game client requests an outcome from your backend.
2. The backend reconstructs trusted context from player inventory, event state, pity counters, eligibility, and policy version.
3. OS Probabilities executes the table on the backend.
4. The backend stores seed, policy version, selected IDs, and context references in the transaction record.
5. The backend returns only the player-facing reward payload to the client.
6. Support or QA tools use `explain` later with the same seed and context references.

## Unity Shape

~~~csharp
public sealed class OpenLootboxRequest
{
    public string BoxId { get; set; } = "";
    public string OpenId { get; set; } = "";
}

public sealed class OpenLootboxResponse
{
    public string[] ItemIds { get; set; } = Array.Empty<string>();
    public string Seed { get; set; } = "";
    public string PolicyVersion { get; set; } = "";
}
~~~

Unity should call the backend endpoint and render the returned rewards. Do not let the client submit authoritative `ownedItems`, `legendaryMisses`, or eligibility context.

## Godot Shape

~~~gdscript
var request = {
  "boxId": "frost-box",
  "openId": "open-0001"
}

# Send request to the authoritative backend. The backend runs OS Probabilities.
~~~

Use local client-side OS Probabilities only for previews, design tools, or non-durable effects where the result has no economy impact.

## Browser/WASM Shape

The TypeScript core already runs in browsers through normal bundlers. The Rust/WASM crate currently proves deterministic primitives. A future full WASM runtime should pass `fixtures/determinism/runtime-cases.json` before it is used for authoritative parity claims.
