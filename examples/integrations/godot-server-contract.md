# Godot Server-Authoritative Contract

Godot clients should request outcomes from a backend service for durable economy decisions.

~~~gdscript
var body = JSON.stringify({
  "boxId": "frost-box",
  "openId": "open-9001"
})

# Send body to your backend. The backend runs OS Probabilities and returns item IDs.
~~~

Local Godot-side probability previews are fine for UI, design tools, and non-durable effects. They should not be the authority for inventory, currencies, or paid rewards.
