# AEGIS Ontology Wave 2 — Link Analysis

Implements the second slice of [#114](https://github.com/Blackleets/aegis/issues/114): force-graph link analysis over Wave 1 ontology graphs.

Stacked on [Wave 1](./ontology-wave1.md) (`feat/ontology-wave1`).

## Added

- `src/lib/ontology/link-graph.ts` — pure `ontologyGraphToLinkGraph` (fail-closed: drop dangling edges; never invent nodes)
- `src/components/dashboard/LinkAnalysisPanel.tsx` — desktop-first `react-force-graph-2d` surface (dynamic `ssr:false`)
- Case cards expose **Grafo** next to **Ontología**
- `tests/ontology-link-graph.test.ts`

## Behaviour

1. Build ontology via `operationalCaseToOntologyGraph` (Wave 1 adapter).
2. Transform with `ontologyGraphToLinkGraph` → `{ nodes, links }` for force-graph.
3. Edge type labels rendered on links; node click selects entity (callback / detail strip).

## Non-goals

- Durable saved investigations (Wave 3)
- Fake live graph feeds / Supabase
- Changes to AegisMap, globe, navigation HUD, SolarSystemMode

## Demo

1. Open dashboard with corroborated multi-source signals so Operational Cases appear.
2. **Centro de casos** → **Grafo** on a case.
3. Confirm nodes match ontology entities; dangling edges never appear; click a node for entity detail.
