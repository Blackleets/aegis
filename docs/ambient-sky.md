# Ambient sky (day / night / weather feel)

Subtle full-viewport wash driven by **live Open-Meteo** via `useLocalWeather`. No invented weather, no decorative particles.

## Data

| Field | Use |
|-------|-----|
| `isDay` | Fallback day vs night |
| `sunrise` / `sunset` | Dawn, golden hour, dusk windows |
| `icon` / atmosphere | Existing `WeatherAtmosphere` for cloud/rain/snow/fog/storm only |

Clear sun/moon still has **no** cloud atmosphere (policy unchanged). Clear sky gets wash only.

## Phases

- `dawn` — ~50 min after sunrise (or approaching sunrise at night)
- `day` — daytime outside dawn/golden/dusk
- `golden` — last ~45 min before sunset
- `dusk` — around sunset (±50 min)
- `night` — otherwise when not day

## Navigation

While a route is active, wash + weather atmosphere dim (`--navigation`) so the HUD stays glanceable.

## Surfaces

- `AmbientSky` — fixed wash (`z-index` below chrome, above map)
- `WeatherAtmosphere` — precip/clouds when live icon supports them
- `WeatherCapsule` — compact live readout (hidden during nav)

Respects `prefers-reduced-motion` (no animated wash).
