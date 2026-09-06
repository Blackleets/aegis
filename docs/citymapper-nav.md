# Citymapper-style realtime navigation (AEGIS)

Ported patterns (without leaving AEGIS voice / data-truth rules):

| Citymapper pattern | AEGIS implementation |
|---|---|
| Compare journeys with clear tradeoffs | `buildJourneyBoard` + pre-nav route cards |
| Live ETA with disruption awareness | `buildLiveArrivalLabel` + TomTom delay when live |
| One-tap switch when a better route appears | "Mejor ruta disponible" banner during nav |
| No invented disruptions | Traffic delay only when `trafficInsight.status === 'live'` |

Does not add paid transit GTFS in this PR.
