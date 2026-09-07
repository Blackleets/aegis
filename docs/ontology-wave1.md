# AEGIS Ontology Wave 1

Implements the first slice of [#114](https://github.com/Blackleets/aegis/issues/114): a shared object model with fail-closed provenance and an end-to-end path from operational cases → entities → drawer UI.

## Added

- `src/lib/ontology/types.ts` — Entity / Relationship / Claim / Provenance
- `src/lib/ontology/provenance.ts` — `requireProvenance`, claim filtering (fail-closed)
- `src/lib/ontology/adapters.ts` — `operationalCaseToOntologyGraph`, `operationalSignalToEntities`
- `src/components/dashboard/EntityDrawer.tsx` — operator-facing ontology inspection
- Case cards expose **Ontología** to open the drawer

## Non-goals (later waves)

- Force-graph link analysis UI — see [Wave 2](./ontology-wave2.md)
- Durable saved investigations (Wave 3)
- Supabase / new paid providers

## Demo

1. Open the dashboard with corroborated multi-source signals so Operational Cases appear.
2. Expand **Centro de casos** → press **Ontología** on a case.
3. Confirm entities show real `source` + timestamps; no fabricated provenance.
