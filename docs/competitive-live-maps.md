# Competitive notes — live world maps (App Store)

Likely apps Lewis meant when saying "hay un mapa en Apple Store… sumamente interesante":

1. **Orbital: Earth Monitor** — satellite map + 10+ scientific sources (EONET, FIRMS, USGS/FDSN, GDACS, ReliefWeb…). Trending-by-severity, watchlist, dark UI.
2. **GlobalAlert** — natural disasters on Apple Maps globe, clustered markers, widgets/Watch.
3. **MonitorWorld** — closest AEGIS peer: OSINT + conflicts + cyber + disasters + source-linked alerts.
4. **Observe Earth** — multilingual live events + daily briefing + GDACS/USGS.

## Extract for AEGIS (priority order)
1. World Pulse ranked strip (this PR)
2. Clustered catastrophe markers when zoomed out
3. Watchlist / saved events (local storage; no Supabase expansion)
4. Morning briefing card from verified sources only
5. Optional GDACS integration after reliability review
