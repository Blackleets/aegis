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

## Soft 2D map pins

- Optional toggle in the World Pulse panel (default on)
- **Durable at dashboard page** via `useWorldPulseMapPins` — pin source + Pins toggle survive mobile drawer / desktop-rail unmount so mercator pins stay available on mobile
- Panel reports filtered events + toggle through callbacks; page runs `selectWorldPulseMapPins` (no setState-in-effect push from the panel)
- Cap: top **25** by severity (then score) — see `selectWorldPulseMapPins`
- Rendered **only** when map projection is `mercator` (2D). Globe / Earth / Three.js / SolarSystemMode paths stay untouched
- Soft glow markers using AEGIS severity tokens (rose critical, amber elevated, cyan watch)
- Pin click uses the same locate/fly behavior as panel rows (`onLocate`)
- Fail-closed: no coords / no identity → no pin; empty feed → no pins; transient fetch errors do not clear last good pins
