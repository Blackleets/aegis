# Aegis system inventory

## Purpose
Aegis is a Next.js 16 intelligence dashboard that combines market signals, OSINT/news, map-based situational awareness, CCTV/live feeds, weather/space-weather context, and AI-generated analyst briefings.

## Confirmed stack
- Next.js 16.2.6
- React 19.2.4
- TypeScript 5
- App Router with route handlers under `src/app/api/*`
- Map/UI libraries in active use:
  - `maplibre-gl`
  - `react-map-gl`
  - `react-force-graph-2d`
  - `framer-motion`
  - `lucide-react`

## Core UI shell
- `src/app/page.tsx`
  - main dashboard composition/orchestration
- `src/components/AegisMap.tsx`
  - tactical map canvas and overlays
- `src/components/MarketsPanel.tsx`
  - market watch surface for defense, energy, materials, digital assets, indices
- `src/components/AiAnalyst.tsx`
  - analyst chat / local or Gemini-backed analysis
- `src/components/SentinelCompanion.tsx`
  - posture/command companion overlay
- `src/components/IntelFeed.tsx`
  - live intel/news feed
- `src/components/CameraViewer.tsx`
  - live camera viewing surface
- `src/components/OsintPanel.tsx`
  - OSINT tooling panel
- `src/components/ScmPanel.tsx`
  - supply-chain monitoring panel

## Critical backend domains

### Tier 1 — user-facing primary value
- `src/app/api/markets/route.ts`
- `src/app/api/news/route.ts`
- `src/app/api/ai/analyze/route.ts`
- `src/app/api/health/route.ts`
- `src/app/api/weather/route.ts`
- `src/app/api/space-weather/route.ts`

### Tier 2 — situational enrichment
- `src/app/api/live-news/route.ts`
- `src/app/api/gdelt/route.ts`
- `src/app/api/flights/route.ts`
- `src/app/api/maritime/route.ts`
- `src/app/api/satellites/route.ts`
- `src/app/api/frontlines/route.ts`
- `src/app/api/region-dossier/route.ts`
- `src/app/api/country-risk/route.ts`
- `src/app/api/infrastructure/route.ts`
- `src/app/api/fires/route.ts`
- `src/app/api/earthquakes/route.ts`

### Tier 3 — specialist / operational tooling
- `src/app/api/osint/*`
- `src/app/api/sdk/*`
- `src/app/api/cctv/*`
- `src/app/api/github-webhook/route.ts`
- `src/app/api/usage/route.ts`
- `src/app/api/stats/route.ts`
- `src/app/api/sentinel/route.ts`

## AI operating modes
- Premium mode when one or more `GEMINI_API_KEY_{1..8}` variables are configured
- Local fallback mode when no server key or BYOK header is present
- Current AI fallback entrypoint:
  - `src/app/api/ai/analyze/route.ts`

## Current quality gates now in repo
- `npm run lint`
- `npm run build`
- `npm test`

## Test baseline added in this pass
- `tests/health-lib.test.ts`
- `tests/health-route.test.ts`
- `tests/ai-analyze-route.test.ts`

## Known architecture pressure points
- `src/app/page.tsx` is still a large orchestration surface
- many route handlers directly encapsulate provider/fetch logic
- broad endpoint surface means observability and consistency matter more than adding raw feature count

## Recommended next technical move
1. extract more shared API response/fetch policy helpers under `src/lib/api/*`
2. progressively move provider logic out of route handlers
3. add smoke coverage for markets/news next
