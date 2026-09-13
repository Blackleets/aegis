# Recent destinations

Local-only Places Autocomplete–style history for `¿A dónde vas?` (no Google Maps Platform keys).

- Storage key: `aegis.recent-destinations.v1` via `globalThis.localStorage`
- Up to 8 entries: `{ label, lat, lng, placeId?, updatedAt }`
- Shown under Casa / Trabajo when the query is empty
- Tap routes/selects; long-press removes one; clear control wipes the list
- Written on successful select/route (OSM / existing geocode results only)
- Fail-closed: invalid coords or empty labels are dropped; storage errors return empty / null
