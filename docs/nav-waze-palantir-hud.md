# Nav HUD polish — Waze + Palantir

Wires unused `useLiveRouteIncidents` into the mobile navigation cockpit and upgrades incident copy with:

- Glanceable **action** line (Waze-style driver guidance)
- **confidence** from TomTom probability / report count (Palantir-style trust)

Live on-route TomTom incidents take priority over earthquake/context banners while navigating.
