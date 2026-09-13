# Ambient sky (day / night / weather feel)

Subtle full-viewport wash driven by **live Open-Meteo** via `useLocalWeather`. No invented weather, no decorative particles/stars.

## Data

| Field | Use |
|-------|-----|
| `isDay` | Fallback day vs night |
| `sunrise` / `sunset` | Dawn, golden hour, dusk windows |
| `icon` | Mood: clear / overcast / precip / storm |
| atmosphere | Existing `WeatherAtmosphere` for cloud/rain/snow/fog/storm only |

Clear sun/moon still has **no** cloud atmosphere (policy unchanged). Clear sky gets wash + soft horizon band only.

## Phases

- `dawn` — ~50 min after sunrise (or approaching sunrise at night)
- `day` — daytime outside dawn/golden/dusk
- `golden` — last ~45 min before sunset
- `dusk` — around sunset (±50 min)
- `night` — otherwise when not day (screen-blend so it reads on dark basemap)

## Mood

Derived from live icon only: `clear` | `overcast` | `precip` | `storm` (CSS filter tint).

## Navigation

While a route is active, wash dims (`--navigation`) so the HUD stays glanceable.

## DOM hooks

`document.documentElement` gets `data-ambient-phase` and `data-ambient-mood` while Earth Ops is visible — used for a light capsule rim, not clutter.

Respects `prefers-reduced-motion`.
