# Appearance + country scope

## Theme
Uses DESIGN.md tokens via CSS variables:
- `dark` — sovereign orbital default
- `light` — white/light surfaces, same brass/cyan authority
- `system` — follows `prefers-color-scheme`

Boot script `APPEARANCE_BOOTSTRAP_SCRIPT` prevents flash. Controls in ModeDock (desktop) and Ajustes panel (mobile drawer).

## Country
Operator country preference scopes situational feeds to a curated bbox list (`operator-country.ts`). `auto` uses GPS detection. Navigation remains origin to destination based; country scopes feeds, never invents regional data.
