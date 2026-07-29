# Design QA — Navigation-first home

## Source

- User-provided mobile screenshot of the current AEGIS entry screen.
- Target behavior: a Waze-like navigation-first start while keeping the existing globe unchanged in `Explorar`.

## Implemented comparison

- Removed the centered logo, headline, supporting paragraph, and duplicate quick actions from the entry layer.
- Changed the initial map projection to the existing 2D map.
- Kept one primary destination action and one secondary route-alert action.
- Kept `Explorar` as the explicit transition to the existing 3D globe.
- Hid the underlying mobile command drawer while the entry layer is visible to prevent overlap.

## Verification

- Unit tests: passed (59/59).
- Lint: passed.
- Production build: passed.
- Cloud-browser preview: blocked by `ERR_CONNECTION_REFUSED`.
- Local mobile Playwright: blocked because the Chromium executable is not installed in this environment.

## Result

final result: blocked

Visual comparison remains blocked until CI/Vercel can render the branch in a browser-enabled environment.
