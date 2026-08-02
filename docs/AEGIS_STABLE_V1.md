# AEGIS Stable V1

Release status: **stabilization complete**

This document defines the supported product boundary for the first stable AEGIS release. The objective of this release is operational reliability, map clarity and safe navigation behavior—not feature expansion.

## Supported surfaces

- Earth situational-awareness map
- Focus mode
- Desktop and mobile operational shells
- GPS position and camera follow
- Route calculation and alternatives
- TomTom traffic insight integration
- Route alerts and local-risk monitoring
- Live operational feeds, incidents, weather and earthquakes
- Local and Zulu clocks
- Accessibility-safe reduced-motion behavior

## Stability work included

- Mobile incident reporting crash protection
- Notification, speech synthesis and browser-capability hardening
- Storage adapters and pre-hydration guards
- Sentinel, AI Analyst, top HUD, side rails and bottom HUD visual refinement
- Compact mode selector and Focus overlay
- Pointer telemetry throttling
- Interaction-aware ambient animation suspension
- Stable local-time formatting and resynchronization
- Valid `display: contents` wrapper behavior
- Retirement of the inactive solar renderer and unused WebGL module

## Explicitly outside this release

- Supabase integration
- New experimental dashboards
- Additional decorative modes
- Large UI redesigns
- New data providers without reliability review
- Reintroduction of the retired solar experience

## Compatibility notes

The dashboard shell still keeps a minimal solar compatibility adapter and legacy URL/state parsing. It renders nothing and carries no active WebGL or animation workload. Removing that boundary safely requires first decomposing the large dashboard page into smaller modules; it is not a production-critical task for Stable V1.

Planet texture files remain in the repository as rollback/reference assets, but no active application module references or loads them.

## Release gates

A release is accepted only when all of the following pass on the exact pull-request head and the exact merged `main` commit:

- lint
- unit tests
- production build
- Playwright smoke tests
- CodeQL
- dependency review
- Vercel preview
- Vercel production deployment

## Change policy after release

AEGIS enters maintenance mode after this release.

Allowed without a new product-planning cycle:

- critical crash fixes
- security fixes
- broken data-provider fixes
- routing, GPS or alert correctness fixes
- accessibility regressions

Everything else should be collected into the next improvement system and delivered through a planned release branch rather than a chain of unrelated micro-PRs.

## Recovery point

Stable baseline before this release branch:

`d23a2ebd86920bacb5dd159ba3f4e33d16f984ec`

Release branch:

`release/aegis-stable-v1`
