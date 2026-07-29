<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AEGIS Agent Contribution Contract

This file applies to the entire repository. More specific `AGENTS.md` files may add constraints for a subtree but may not weaken these rules.

## Mission

AEGIS is a mobile-first live intelligence map and GPS navigation surface. Improve real usefulness, reliability, accessibility, privacy, and performance without turning the map into a crowded dashboard.

## Non-negotiable product rules

1. Never present simulated, random, placeholder, cached-without-label, or inferred data as live.
2. Every operator-facing metric must identify what it measures and have a real source or disappear gracefully.
3. Keep the mobile map clean. New persistent overlays require evidence that they do not obstruct navigation controls, route instructions, alerts, or the user-position marker.
4. Driving flows must not require typing. Prefer glanceable information, large touch targets, voice, and stopped-only interaction.
5. Preserve the existing Earth, map, GPS, routing, alert, and camera behavior unless the PR explicitly improves and tests it.
6. Do not add paid services, billing requirements, or mandatory API keys without maintainer approval.
7. Do not add Supabase database dependencies until the maintainers explicitly reopen that phase. Existing realtime presence is compatibility infrastructure, not permission to expand Supabase usage.
8. Never commit credentials, tokens, private endpoints, personal data, signing keys, `.env` files, or captured user locations.
9. OSINT and security functionality must remain defensive, lawful, rate-limited where appropriate, and limited to authorized targets.

## Required workflow

1. Start from the latest `main`.
2. Use a focused branch and one coherent change per PR.
3. Inspect nearby code and tests before editing.
4. Prefer the smallest reversible implementation that solves the issue.
5. Add or update tests for behavior changes.
6. Run:

   ```bash
   npm test
   npm run lint
   npm run build
   ```

7. Complete every section of the PR template with real evidence.
8. Do not claim a check, device test, API response, screenshot, or deployment passed unless you actually observed it.
9. Do not merge your own PR. Maintainers decide when a verified branch enters `main`.

## Source and API requirements

- Prefer primary, official, documented, and free sources.
- Validate coordinates, query parameters, upstream payloads, timeouts, and HTTP failures.
- Use explicit source names and timestamps in responses where users could mistake stale data for live data.
- Add caching that matches the source update frequency; do not call public APIs on every render or GPS fix.
- Degrade to `unavailable`, `unknown`, or hidden UI. Never manufacture a fallback value.
- Document new environment variables in the repository templates without real secret values.

## Mobile and navigation acceptance

- Test at a narrow mobile viewport before requesting review.
- Touch targets should normally be at least 44×44 CSS pixels.
- Respect safe-area insets.
- Verify closed, open, loading, error, navigation-active, and permission-denied states where applicable.
- Avoid permanent overlays in the top navigation row unless they have a dedicated non-overlapping slot.
- GPS changes must account for inaccurate fixes, stale fixes, stationary jitter, route snapping, and genuine off-route movement.

## Pull requests that will be rejected

- Large unrelated rewrites or formatting-only churn mixed with behavior changes.
- “AI cleanup” without a concrete bug, user outcome, benchmark, or test.
- Fake live counters, fake traffic, fake alerts, or fabricated sources.
- Removal or weakening of tests, security controls, attribution, accessibility, or error handling to make checks pass.
- New dependencies without justification.
- Generated code that the author did not inspect.
- Screenshots or descriptions that expose secrets or personal location history.

## Useful starting points

- `CONTRIBUTING.md` — contribution process and PR sizing.
- `docs/service-matrix.md` — service and data-source inventory.
- `src/app/page.tsx` — primary dashboard orchestration.
- `src/components/AegisMap.tsx` — map rendering.
- `src/components/dashboard/RouteCockpitMobile.tsx` — mobile navigation.
- `tests/` — behavioral and route-level tests.

When uncertain, open a focused proposal issue before writing a large patch.
