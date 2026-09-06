# Organic Maps–inspired nav HUD (AEGIS skin)

Active navigation chrome follows free GPS glanceability (Organic Maps / OsmAnd Free), painted with AEGIS tokens.

## Layout

- **Top banner**: cyan maneuver column (icon + distance) | instruction | mute
- **Bottom sheet**: Llegada · Restante · Distancia/modo | report · recenter · pause · exit
- **Speed**: floating chip only in driving mode (not in the crowded bottom row)
- No “Copiloto activo” chrome in the instruction banner

## Distance copy

`formatStepDistance` rounds for glanceability (`Ahora`, 5/10/25 m steps) instead of noisy `1 m`.

## Files

- `RouteCockpitMobile.tsx`
- `navigation-mobile.css`
- `routing-shell.ts`
