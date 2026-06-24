# AEGIS

AI-enhanced open-source intelligence and situational awareness platform built on top of the original OSIRIS codebase.

![License](https://img.shields.io/badge/license-MIT-gold)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Status](https://img.shields.io/badge/status-build%20verified-brightgreen)

AEGIS turns the original global-intel dashboard into a sharper operator workspace with integrated AI analysis, fusion dossiers, live layers, recon tooling, and premium rebranding.

## What changed vs the original base

- Rebrand from OSIRIS to AEGIS across primary UI and metadata
- AI analyst mounted directly in the main dashboard
- New Fusion Dossier workflow and API endpoint: `/api/ai/fusion`
- Local Gemini key namespace changed to `aegis-gemini-key`
- Updated share text, proxy metadata, and operator-facing labels
- Build validated after the changes

## Core capabilities

- Live global map and intelligence overlays
- Threat monitoring and recon workflows
- AI analyst chat for operational assessment
- Structured fusion dossiers with BLUF, risk, confidence, hotspots, actions, and watchlist
- Region dossiers, alerts, markets, incidents, weather, satellites, and OSINT layers

## Quick start

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment

Copy one of these files and fill only what you need:

- `.env.example`
- `.env.template`

Notes:
- The platform can run without most third-party keys.
- Some legacy env names still use `OSIRIS_*` for compatibility with the inherited codebase and docker setup.
- RECON scanner features require `SCANNER_URL` and `SCANNER_KEY`.

## AI setup

For the AI analyst and fusion features, add at least one Gemini key:

```env
GEMINI_API_KEY_1=your_key_here
```

You can add more keys for rotation:

```env
GEMINI_API_KEY_2=
GEMINI_API_KEY_3=
```

## Build status

Verified locally:

```bash
npm run build
```

Build passes.

`npm run lint` still reports a large amount of pre-existing debt inherited from the original project. That cleanup is a separate hardening pass, not a blocker for the current build.

## Attribution and license

AEGIS is a derivative work based on the original OSIRIS project by simplifaisoul.

- Original license preserved: MIT
- Original copyright notice preserved in `LICENSE`
- This repo adds rebranding, integration work, and AI/operator workflow improvements on top of that base

## Suggested next steps

- Finish deeper naming cleanup in internal component/file names
- Reduce inherited lint debt and `any` usage
- Add screenshots and demo GIFs
- Add authentication, saved workspaces, and alert persistence
- Ship verticalized intelligence packs for specific niches
