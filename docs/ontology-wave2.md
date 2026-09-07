# AEGIS Ontology Wave 2 — Link Analysis

Implements the second slice of [#114](https://github.com/Blackleets/aegis/issues/114): force-graph link analysis over Wave 1 ontology graphs.

Stacked on [Wave 1](./ontology-wave1.md) (`feat/ontology-wave1`).

## Added

- `src/lib/ontology/link-graph.ts` — pure `ontologyGraphToLinkGraph` (fail-closed) + Spanish kind/rel labels, colors, legend helpers
- `src/components/dashboard/LinkAnalysisPanel.tsx` — desktop-first `react-force-graph-2d` with kind/edge legends, pill labels, typed edge colors
- Case cards expose **Grafo** next to **Ontología**
- `tests/ontology-link-graph.test.ts`

## Behaviour

1. Build ontology via `operationalCaseToOntologyGraph` (Wave 1 adapter).
2. Transform with `ontologyGraphToLinkGraph` → `{ nodes, links }` for force-graph.
3. Edge chips show Spanish relationship labels; node pills show kind + name; click opens entity detail.

## Clarity polish

- Legend chips for entity kinds and relationship types actually present
- Edge canvas labels with readable backdrop (not raw `snake_case`)
- Selected node ring + stronger label pill
- Confidence modulates node opacity / edge width (no invented confidence)

## Non-goals

- Durable saved investigations (Wave 3)
- Fake live graph feeds / Supabase
- Changes to AegisMap, globe, navigation HUD, SolarSystemMode

## Demo

1. Open dashboard with corroborated multi-source signals so Operational Cases appear.
2. **Centro de casos** → **Grafo** on a case.
3. Confirm legends match colors; dangling edges never appear; click a node for entity detail.
