# World Pulse

Competitive takeaways from App Store live-Earth apps (**Orbital**, **GlobalAlert**, **MonitorWorld**, **Observe Earth**):

| Pattern | Ported into AEGIS |
|---|---|
| Ranked global catastrophe feed | `/api/world-pulse` + severity/recency score |
| Multi-source scientific feeds | USGS + NASA EONET + NASA FIRMS |
| Source attribution on every card | `source` + optional `source_url` |
| Fail closed / degraded status | `ok` / `degraded` / `unavailable` |
| Tap-to-locate on map | `WorldPulsePanel` → `onLocate` |

Non-goals this PR: fake live counters, GDACS paid keys, breaking existing map layers.
