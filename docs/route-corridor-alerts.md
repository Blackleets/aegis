# Avisos en tu ruta (route corridor, opt-in)

Anti-Waze corridor filter for the situational radar: only real, preferenced events along the active route.

## Product intent (ES)

Cuando navegas p. ej. **Móstoles → Madrid**, el chip **En ruta** muestra eventos verificados que caen en el corredor de la ruta **si** el usuario activó esas categorías en Preferencias. No es spam global.

- Preferencias: `route-alert-preferences` + `RouteAlertPreferencesPanel`
- Geometría: `resolveRouteAlertPosition` (fail-closed)
- Lógica: `src/lib/route-corridor-alerts.ts`

## Kind → preferencia

| Kind | Pref |
|------|------|
| earthquake | earthquakes |
| wildfire | wildfires |
| volcano | volcanoes |
| storm / flood / weather | severeWeather |
| news / conflict / other | **omitidos** del corredor (por ahora) |

## Cuándo se muestra

`shouldShowRouteCorridorAlerts` = `shouldMonitorLocalRisks(navigationActive, localMonitoring)`.

- Chip **En ruta** habilitado solo si monitoring **y** la ruta tiene coordenadas.
- Sin navegación y sin `localMonitoring` → lista de corredor vacía.
- Filas: distancia (“a 3,2 km”) · source · tiempo relativo.

## Demo Móstoles → Madrid

1. Activa categorías (terremotos / clima / etc.) en Preferencias del conductor.
2. Calcula ruta **Móstoles → Madrid** e inicia navegación (o activa Vigilancia local con ruta cargada).
3. Abre Radar situacional → chip **En ruta**.
4. Si hay un sismo/incendio/clima real con coords en el corredor y la categoría on → aparece con distancia adelante.
5. Sin eventos en corredor → “Nada en tu corredor ahora”.
6. Sin prefs / sin navegación → chip deshabilitado / “Activa preferencias o inicia navegación”.
7. Chips globales (Todos / Tierra / …) siguen siendo el radar mundial — sin spam de corredor.

No inventa incidentes comunitarios; no toca globe / SolarSystemMode.
