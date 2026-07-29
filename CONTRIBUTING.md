# Contributing to AEGIS

Thanks for helping improve AEGIS. Human contributors and AI coding agents are welcome under the same standard: small scope, real evidence, clean tests, and no fabricated telemetry.

## Before you begin

- Read `AGENTS.md`, `SECURITY.md`, and the relevant code and tests.
- Search existing issues and pull requests to avoid duplicate work.
- Use an issue first for a major redesign, new provider, new permission, schema change, paid dependency, or architectural rewrite.
- Never report a security vulnerability in a public issue. Follow `SECURITY.md`.

## Good contributions

- A reproducible bug fix with a regression test.
- Mobile overlap, accessibility, performance, or battery improvements backed by measurements or screenshots.
- A real public-data integration with source, freshness, failure behavior, and rate limits documented.
- GPS and routing improvements tested against poor accuracy, stationary jitter, deviation, and arrival.
- Documentation that matches the current product.

## Pull request size

Keep one user outcome per PR. As a guide:

- **Small:** up to roughly 200 changed lines.
- **Medium:** up to roughly 500 changed lines with focused tests.
- **Large:** discuss in an issue first and split into independently reviewable PRs.

Generated lockfile or data changes should be explained separately from handwritten code.

## Local setup

```bash
git clone https://github.com/Blackleets/aegis.git
cd aegis
npm ci
npm run dev
```

Use placeholder values from `.env.example` or `.env.template`. Never commit a real secret.

## Required checks

Run all three before requesting review:

```bash
npm test
npm run lint
npm run build
```

For user-interface changes, also test the affected mobile or desktop flow and include a screenshot without private information.

## Data truth standard

AEGIS distinguishes between:

- **Live:** directly fetched or streamed from a named source and fresh within a documented interval.
- **Recently observed:** real source data with an observation timestamp.
- **Estimated:** an explicitly labeled calculation based on real inputs.
- **Unavailable:** the honest result when a provider, permission, or key is missing.

Do not label demo, simulated, randomly generated, hard-coded, or unverified values as live. Simulation may exist only as an explicit developer/test mode.

Every new data provider must document:

- provider and official URL;
- license or allowed usage;
- authentication and cost;
- refresh/caching interval;
- timeout and unavailable behavior;
- user data sent to the provider.

## Mobile navigation standard

- Keep the map visible and controls non-overlapping.
- Do not require typing while navigation is active.
- Prefer one-tap, voice, or stopped-only interaction.
- Respect Android/iOS safe areas and 44×44 px touch targets.
- Never imply background navigation works unless it has been tested as a native background capability.

## AI-authored contributions

AI agents must:

- state that AI assisted the change;
- identify the model/tool only if known;
- list the files inspected before editing;
- explain how the output was verified;
- avoid broad speculative refactors;
- leave decisions requiring credentials, money, legal consent, or product policy to maintainers.

The human or organization submitting a PR remains responsible for its code, licensing, safety, and claims.

## Review and merge

Opening a PR does not grant write access or permission to deploy. Maintainers review the diff, evidence, CI, security implications, and product fit. Only approved, green PRs are merged into `main`.

By contributing, you agree that your contribution is provided under the repository’s MIT license.
