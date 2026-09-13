# AEGIS Ontology Wave 4 — Fusion / dossier provenance

Implements the fourth slice of [#114](https://github.com/Blackleets/aegis/issues/114): every BLUF / hotspot / action / region-dossier claim carries source refs, or is hidden / marked **sin procedencia**. Never invent live OSINT.

Stacked on [Wave 3](./ontology-wave3.md) (`feat/ontology-wave3-investigations`).

## Added

- `src/lib/ontology/fusion-claims.ts` — map fusion + region-dossier outputs → `OntologyClaim[]` via Wave 1 `requireProvenance` / `filterClaimsWithProvenance`
- `hardenFusionDossier` — omit unproven hotspots / actions / watchlist; mark BLUF unavailable instead of fabricating a source
- `regionDossierToClaims` — fail-closed claims for Nominatim / REST Countries / Wikipedia / Wikidata / Open-Meteo / named CCTV
- `operationalFusionToDisplayItems` — source chips for case signals; count-derived evidence stays **sin procedencia**
- `tests/ontology-fusion-claims.test.ts`
- Incident Fusion Strip + Region Dossier overlay provenance chips
- `/api/ai/fusion` and `/api/region-dossier` response shaping

## Behaviour

1. Fusion list items without `source` + finite `observedAt` are omitted from operator-facing arrays.
2. BLUF without a unique context match becomes `BLUF no disponible (sin procedencia).`
3. Context attachment only happens when generated text uniquely cites a real feed row (never `Date.now()`, never guessed USGS).
4. Region dossier claims reuse the same filter; unproven intel brief / weather / cameras / head-of-state are hidden or marked unavailable.
5. Fusion strip shows real signal chips when a live operational case is present; mesh-count evidence is labeled **sin procedencia**.

## Non-goals

- Fake live counters / fabricated OSINT
- AegisMap, globe, navigation HUD, SolarSystemMode
- Supabase / new paid providers
- Wave 5 shared API policy / observability

## Demo

1. Open the dashboard with corroborated multi-source signals so Operational Cases appear.
2. Confirm Incident Fusion evidence chips: case signals show `source · timestamp`; count-only lines show **sin procedencia**.
3. Generate a fusion dossier (`/api/ai/fusion`). Uncited hotspots/actions disappear; BLUF without a unique source is marked unavailable.
4. Right-click the map for a region dossier. Provenanced claims show source chips; Wikipedia / weather / cameras without provenance stay hidden or **sin procedencia**.
