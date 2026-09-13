# AEGIS Ontology Wave 3 — Durable investigations

Implements the third slice of [#114](https://github.com/Blackleets/aegis/issues/114): promote ephemeral operational clusters into operator-owned investigation workspaces.

Stacked on [Wave 2](./ontology-wave2.md) (`feat/ontology-wave2-link-analysis`).

## Added

- `src/lib/ontology/investigations.ts` — `SavedInvestigation` + `readInvestigations` / `upsertInvestigation` / `deleteInvestigation` / `promoteOperationalCaseToInvestigation` (fail-closed)
- `tests/ontology-investigations.test.ts`
- **Guardar** on operational case cards → durable workspace
- **Investigaciones guardadas** section in `OperationalCasesPanel` (notes, delete, open ontology drawer)
- Clear labels: **cluster en vivo** vs **investigación guardada**

## Persistence

- `localStorage` key `aegis.investigations.v1` only
- Access via `globalThis.localStorage` (vitest-friendly, same pattern as saved-destinations)
- No Supabase / no new backend

## Behaviour

1. Live cases remain ephemeral geo clusters (**cluster en vivo**).
2. **Guardar** builds ontology via Wave 1 adapter, then promotes with pinned Case entity id, empty notes/watchlist, and optional `mapPin` only when the case already has real lat/lng (never invented).
3. Saved workspaces keep a graph snapshot so the drawer still opens after the live cluster expires.
4. Corrupt storage entries are dropped instead of throwing.

## Non-goals

- Supabase / shared multi-user investigation sync
- Changes to AegisMap, globe, navigation HUD, SolarSystemMode
- Invented coordinates or fabricated provenance

## Demo

1. Open dashboard with corroborated multi-source signals so Operational Cases appear.
2. Under **cluster en vivo**, press **Guardar** on a case.
3. Confirm it appears under **Investigaciones guardadas** with label **investigación guardada**.
4. Edit notes, open **Ontología**, delete — all stay on this device only.
