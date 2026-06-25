# AEGIS

AI-enhanced open-source intelligence and situational awareness platform for live operator workflows.

![License](https://img.shields.io/badge/license-MIT-gold)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Build](https://img.shields.io/badge/build-verified-brightgreen)
![Lint](https://img.shields.io/badge/lint-clean-brightgreen)

AEGIS turns public telemetry into an operator-ready intelligence workspace with live map layers, browser-based recon tools, AI briefings, and fusion dossiers.

## What it is

AEGIS is a Next.js command-center style web app that combines:

- live global tracking layers
- open-source intelligence workflows
- browser-accessible recon tooling
- AI-generated analysis and fusion briefs
- operator-focused UI for fast situational assessment

## Core capabilities

- Live global map with flights, satellites, fires, weather, maritime, CCTV, infrastructure, and incident overlays
- RECON toolkit for DNS, WHOIS, SSL, headers, CVE, threat, phone, MAC, GitHub, and IP sweep workflows
- AI analyst panel for operational questioning and synthesis
- Fusion dossier generation with BLUF, confidence, risk framing, hotspots, actions, and watchlists
- Region dossier workflow for compact geopolitical context
- Live alerts, market context, and OSINT side panels inside one interface

## Stack

- Next.js 16.2.6
- React 19
- TypeScript
- Tailwind CSS 4
- MapLibre GL
- Framer Motion
- Gemini API integration for AI-assisted analysis

## Verified status

Verified locally on this repo revision:

```bash
npm run lint
npm run build
```

Current status:

- `npm run lint` ✅
- `npm run build` ✅

## Quick start

```bash
git clone https://github.com/Blackleets/aegis.git
cd aegis
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment

AEGIS runs without most third-party keys.

Main options:

- `.env.example` → lightweight local setup template
- `.env.template` → fuller self-hosting / deployment reference

Important notes:

- Most data layers work from public keyless sources
- RECON features require a separate scanner backend
- The current codepath mainly consumes `SCANNER_URL` and `SCANNER_KEY` for RECON
- Gemini keys enable AI analyst and fusion flows

Minimum AI setup:

```env
GEMINI_API_KEY_1=your_key_here
```

Minimum RECON setup:

```env
SCANNER_URL=http://your-scanner:7700
SCANNER_KEY=your_shared_key
```

## Docker

For self-hosting with Docker / Docker Compose, see:

- `DOCKER.md`

Fast path:

```bash
cp .env.template .env
docker compose up -d
```

## Why this repo is useful

AEGIS is useful if you want a customizable intelligence dashboard that already ships with:

- a serious app shell instead of a toy demo
- multiple real data routes and overlays
- browser-native OSINT workflows
- AI-assisted summarization on top of live feeds
- a self-hostable base you can verticalize for security, geopolitical, logistics, or crisis-monitoring use cases

## Project structure

```text
src/app/                 Next.js app router, UI shell, API routes
src/components/          Dashboard panels, map UI, analyst and recon components
src/lib/                 SDK, helpers, feed logic, source adapters
public/                  Static assets
DOCKER.md                Self-hosting and deployment guide
.env.example             Minimal local environment template
.env.template            Expanded deployment template
```

## Current polish pass

This revision includes:

- completed AEGIS branding cleanup across operator-facing surfaces
- SDK/env naming stabilization for the rebrand transition
- image warning cleanup via `next/image`
- verified clean lint/build after the stabilization pass

## Attribution and license

AEGIS is a derivative work based on an inherited open-source codebase by simplifaisoul.

- License: MIT
- Original attribution preserved in `LICENSE`
- This repo adds rebranding, integration work, UI hardening, and AI/operator workflow improvements

## Next high-value steps

- Add polished screenshots or a short demo GIF for the README header
- Add verticalized presets or intelligence packs for specific niches
- Add auth, saved workspaces, and alert persistence
- Add lightweight CI to enforce lint/build on every push
