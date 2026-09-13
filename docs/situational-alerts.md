# Radar situacional (Situational Alerts)

Glanceable multi-source incident radar for Earth Ops — Spanish UI, anti-Waze calm density.

## Product intent

Same live-alerts idea as traffic apps, but **better**: real multi-domain coverage users should say *wow* at — not spam or fake community noise.

- **Fail-closed provenance**: every row needs `source` + `observedAt` (+ `id` + `title`). Missing → dropped.
- **Never invent events.** Empty / degraded states stay honest (`Fuentes degradadas`, `Fuentes no disponibles`).

## Sources

| Feed | Role |
|------|------|
| `/api/world-pulse` | Primary: quakes, wildfire, volcano, storm, flood, GDACS, etc. |
| `/api/earthquakes` | USGS backup / dedupe |
| `/api/news` | Verified RSS; telegram blocked; source required |
| `/api/weather` | Optional severe events **only** if lat/lng + source + time (weak/low skipped) |
| Traffic incidents | Skipped unless already shaped with source+time |

Client polls with `Promise.allSettled` (~45s). Caps list at **~40** after merge/dedupe/rank.

## Normalize / merge

Pure helpers in `src/lib/situational-alerts.ts`:

- Unified `SituationalAlert`
- Dedupe by `id` and approx coords + title
- Rank: severity (critical first) then freshness
- UI chips: Todos · Tierra · Clima · Conflicto · Noticias · Otros

## UI

`LiveAlerts.tsx` → header **Radar situacional**. Compact rows: severity pill, kind, title, `source · relative time`, Localizar if coords.

Does **not** touch AegisMap globe layers / SolarSystemMode / invent community incidents.

## Demo checklist

1. Open dashboard → Alerts rail / mobile Alerts drawer.
2. Header reads **Radar situacional**; chips filter kinds.
3. With network: rows show real World Pulse + USGS + news; each has source + relative time.
4. Kill one API (or throttle): status shows **Fuentes degradadas**; counts never fake.
5. Localizar flies map when coords exist; no globe layer mutations.
