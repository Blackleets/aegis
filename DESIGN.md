---
version: alpha
name: AEGIS Sovereign Orbital UI
description: A sovereign orbital intelligence surface: dark command glass, pale brass authority, cold telemetry cyan, and cinematic planetary depth.
colors:
  primary: "#05080D"
  secondary: "#8FA6B8"
  tertiary: "#B9D7EA"
  neutral: "#101923"
  surface: "#0A121B"
  surfaceElevated: "#111E2A"
  surfaceGlass: "#101A24"
  borderSubtle: "#26394A"
  brass: "#B7C8B1"
  brassDim: "#6F806E"
  signalCyan: "#76E4EA"
  signalBlue: "#78A8FF"
  danger: "#FF4B55"
  warning: "#F0A83A"
  success: "#4DFF9A"
  textPrimary: "#F5F9FC"
  textSecondary: "#B7C7D4"
  textMuted: "#73889A"
  onPrimary: "#F5F9FC"
  onTertiary: "#05080D"
typography:
  display:
    fontFamily: JetBrains Mono
    fontSize: 3.2rem
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "0.42em"
  h1:
    fontFamily: Inter
    fontSize: 2.5rem
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  h2:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.45
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 0.68rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.22em"
  micro-caps:
    fontFamily: JetBrains Mono
    fontSize: 0.5rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.28em"
rounded:
  sm: 6px
  md: 14px
  lg: 22px
  xl: 30px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 14px
  lg: 22px
  xl: 34px
  xxl: 56px
components:
  shell-background:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.textPrimary}"
  panel-glass:
    backgroundColor: "{colors.surfaceGlass}"
    textColor: "{colors.textPrimary}"
    rounded: "{rounded.lg}"
    padding: 14px
  panel-glass-quiet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.textSecondary}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.onTertiary}"
    rounded: "{rounded.full}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.primary}"
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.signalCyan}"
    rounded: "{rounded.full}"
    padding: 10px
  badge-live:
    backgroundColor: "{colors.success}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 8px
  badge-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 8px
---

## Overview

AEGIS Sovereign Orbital UI should feel like a private intelligence instrument, not a generic cyber dashboard. The tone is calm, expensive, and operational: a black-blue orbital void, pale brass authority accents, cold cyan telemetry, restrained motion, and glass surfaces that feel engineered rather than decorative.

The product should read as a live command surface with three distinct modes: Earth Ops for real operational data, Solar View for cinematic planetary inspection, and Focus for clean presentation. Differentiation comes from hierarchy, material depth, and intelligence vocabulary — not from adding more widgets.

## Colors

- **Primary ({colors.primary}):** Orbital void. Use for the application background and the deepest shadows.
- **Neutral ({colors.neutral}):** Main structural surface for rails, panels, and non-map shells.
- **Surface / Surface Elevated ({colors.surface}, {colors.surfaceElevated}):** Layered command glass surfaces. Elevated surfaces should be slightly blue, never flat gray.
- **Tertiary ({colors.tertiary}):** Pale command light. Use for primary attention and selected mode states.
- **Brass ({colors.brass}):** Sovereign authority accent. Use sparingly for brand, locks, mode cores, and premium calls to action.
- **Signal Cyan ({colors.signalCyan}):** Live telemetry and stream activity. Avoid using it for every border; reserve it for active data.
- **Danger / Warning / Success:** Operational status only. These colors must communicate state, not decoration.

## Typography

Use Inter for readable interface text and JetBrains Mono for command labels, clocks, chips, telemetry, and brand lockups. The AEGIS wordmark should remain wide-tracked and mono-spaced. Body text should stay quiet and compact. Labels should be uppercase, small, and letter-spaced so the UI feels like an instrument panel.

## Layout

The viewport is a fixed command surface. Keep the center sacred: Earth, planet, or focus surface must dominate. Side rails should behave like instruments, not content pages. Prefer fewer strong blocks over many stacked widgets.

Spacing uses a compact 4px-derived rhythm with slightly irregular premium steps (`14px`, `22px`, `34px`) to avoid the common Tailwind-dashboard look. Use internal scroll areas inside rails rather than growing the page.

## Elevation & Depth

Depth should come from layered glass, subtle inset highlights, and low-opacity colored glow. Avoid loud neon halos. Use stronger glow only for selected modes, planetary accents, and live system status.

Panels should have:
- dark blue-black glass fill,
- thin pale border,
- one soft exterior shadow,
- one tiny top inset reflection.

## Shapes

Corners are precise and engineered. Small controls use `full` pills. Panels use `lg` or `xl` radii. Avoid random rounded values per component; use the token scale.

## Components

- `shell-background` is the app foundation and should never be pure black without blue undertone.
- `panel-glass` is the default command surface card.
- `button-primary` is reserved for the most important action in a context.
- `button-secondary` supports mode changes and low-risk controls.
- `badge-live`, `badge-warning`, and future status badges must represent real state.

## Do's and Don'ts

- **Do** make Earth Ops, Solar View, and Focus visually distinct while keeping one AEGIS material language.
- **Do** preserve real data boundaries: Solar non-Earth views are visual-only unless real data exists.
- **Do** use pale brass and cyan as signal accents, not wallpaper.
- **Do** keep the central map/planet visually dominant.
- **Don't** copy generic cyberpunk neon palettes or purple/blue SaaS gradients.
- **Don't** add panels to prove sophistication; reduce noise and improve hierarchy.
- **Don't** use fake metrics. If a value is decorative or demo-only, label it explicitly.
