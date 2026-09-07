# World Pulse

Ranked live global catastrophe / natural-event feed for Earth Ops.

## Sources (fail-closed)

| Source | What |
|--------|------|
| USGS | M4+ day feed (+ tsunami flag) |
| NASA EONET | Open natural events |
| NASA FIRMS | VIIRS active fires (top FRP) |
| GDACS | Orange/Red multi-hazard alerts |

Missing or malformed upstream → `error`/`empty` for that source. Never invents events.

## Client

- Auto-refresh every 3 minutes
- Kind filters (does not touch map layers)
- “Ver en mapa” only flies the camera — does **not** mutate Earth/globe layer state
