# Maps-grade destination sheet

Polish for mobile `¿A dónde vas?` / `Destino y ruta` toward Google Maps clarity.

## UX

- Bottom bar: larger type, sky mic CTA, live blue-dot “tu ubicación” cue
- Sheet: origin row (Tu ubicación + GPS status) stacked over destination search
- Modes: icon-first Coche / A pie / Bici with filled active state
- GPS auto-requests when the sheet opens (`mobile-nav`)
- Locate centers map on `Mi ubicación`

## Files

- `src/components/SearchBar.tsx`
- `src/components/dashboard/MobileCommandDrawer.tsx`
