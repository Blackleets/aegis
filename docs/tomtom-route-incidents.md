# TomTom route incidents

AEGIS exposes a server-only incident corridor endpoint at `/api/traffic/incidents`.

Required query parameters:

- `fromLat`
- `fromLng`
- `toLat`
- `toLng`

Optional query parameters:

- `paddingKm` — clamped between 0.5 km and 10 km, default 2.5 km
- `limit` — clamped between 1 and 100, default 40

The endpoint uses `TOMTOM_API_KEY` only on the server and calls TomTom Orbis Traffic Incident Details API v2 with the API key in the `TomTom-Api-Key` header.

Operational behavior:

- 90-second fresh cache
- 5-minute stale fallback
- 8-second upstream timeout
- normalized incident categories and severity
- capped, severity-sorted results
- no-store client response
- explicit unavailable/quota/timeout states

This endpoint is intentionally not rendered directly in the cockpit yet. The UI integration should filter incidents against the actual route geometry before presenting a single highest-priority driver alert.
