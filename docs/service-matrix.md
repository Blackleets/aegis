# Aegis service matrix

## Summary
This matrix tracks the most important operational services, their role, and the intended fallback posture.

| Domain | Endpoint | Critical | Primary role | Expected fallback / degradation |
|---|---|---:|---|---|
| Health | `/api/health` | Yes | System readiness snapshot | Return `degraded` or `down` with subsystem detail |
| Markets | `/api/markets` | Yes | Defense, energy, materials, digital asset market board | Empty collections + error metadata if upstreams fail |
| Intel | `/api/news` | Yes | News / intel signal feed | Empty news set + error metadata |
| AI analyze | `/api/ai/analyze` | Yes | Analyst response generation | Local fallback analysis when no valid key/provider response |
| Weather | `/api/weather` | No | Hazard/weather context | Empty events or degraded subsystem |
| Space weather | `/api/space-weather` | No | Solar / geomagnetic context | Degraded subsystem |
| CCTV | `/api/cctv/stream-status` | No | Live feed availability signal | Degraded subsystem |
| Maritime | `/api/maritime` | No | Chokepoints and logistics posture | Missing SCM alerts without collapsing whole app |
| Flights | `/api/flights` | No | Air traffic situational layer | Layer unavailable but dashboard still usable |
| Satellites | `/api/satellites` | No | Orbital layer enrichment | Layer unavailable but dashboard still usable |
| GDELT | `/api/gdelt` | No | Incident/event enrichment | Reduced threat context |
| Region dossier | `/api/region-dossier` | No | Country/location context | Missing dossier panel detail |
| Usage | `/api/usage` | No | Session telemetry / usage status | No usage counters |

## Health policy introduced in this pass
The new `src/lib/health.ts` probes these HTTP-backed subsystems:
- `/api/markets`
- `/api/news`
- `/api/weather`
- `/api/space-weather`
- `/api/cctv/stream-status`

It also reports static/config-backed subsystems:
- `AI Analyst`
- `Map Shell`

## Status semantics
- `ok`: all critical subsystems healthy
- `degraded`: at least one critical subsystem unhealthy, but not all
- `down`: all critical subsystems down

## Follow-up matrix work
Recommended next revision of this document should add:
- upstream source names per route
- timeout budgets per route
- cache headers per route
- owner file / helper module per route
- auth / rate limit posture for sensitive routes
