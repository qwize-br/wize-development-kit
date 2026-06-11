---
playbook: responsive-breakpoints
owner: wize-agent-ux-designer   # Mantis
applies_when: web-overlay active
status: ready
---

# Responsive Layout — Mantis Playbook

Mobile-first by default. Container queries first; media queries when you have to. Fluid typography over stepped scales. **Design from content, not from device.**

## 1. Breakpoint stack (mobile-first)

Token names matter more than the px value — name by intent, not device.

| Token | Min width | Rough viewport | Typical layout shift |
|---|---|---|---|
| `xs` | 0 | phone portrait | single column, full-bleed images |
| `sm` | 480px | phone landscape, phablet | wider gutters, two-col on cards |
| `md` | 768px | tablet portrait | two-column page, persistent header |
| `lg` | 1024px | tablet landscape, small laptop | three-column, sidebar appears |
| `xl` | 1280px | desktop | max canvas, multi-region pages |
| `2xl` | 1536px | large desktop | larger gutters, bigger type |

**Do not** add a breakpoint per device. Add one when the design actually breaks.

## 2. Container queries (preferred for components)

Components should respond to **their own container width**, not the page width. Same card behaves differently in a sidebar vs hero region.

```css
.card { container-type: inline-size; }

@container (min-width: 360px) {
  .card { display: grid; grid-template-columns: 80px 1fr; }
}
```

Use a media query only when the change is page-level (nav layout, page chrome).

## 3. Fluid typography

Step scales jump at breakpoints; fluid scales grow continuously. Use `clamp()` to avoid both extremes.

```css
:root {
  /* clamp(min, preferred, max) */
  --step-0:  clamp(1rem,  0.9rem + 0.5vw, 1.125rem);
  --step-1:  clamp(1.125rem, 1.0rem + 0.7vw, 1.375rem);
  --step-2:  clamp(1.4rem,  1.2rem + 1.0vw, 1.8rem);
  --step-3:  clamp(1.75rem, 1.4rem + 1.7vw, 2.5rem);
  --step-4:  clamp(2.2rem,  1.6rem + 2.5vw, 3.5rem);
}
```

Use **rem** for type, **em** for spacing within type contexts. Never hardcode px on body text.

## 4. Layout primitives (use these names in design specs)

| Primitive | What it does | When |
|---|---|---|
| **Stack** | Vertical rhythm, configurable gap | Default layout. |
| **Cluster** | Inline flex with wrap | Tag rows, action groups. |
| **Switcher** | Switches row → column under threshold | Hero/sidebar pair. |
| **Sidebar** | Sticky content beside main | Lists + detail panes. |
| **Grid** | Auto-fit grid of equal cards | Card walls. |
| **Cover** | Header / centered content / footer | Landing sections. |
| **Frame** | Aspect-ratio container | Videos, hero images. |

These map directly to CSS — keep specs talking about primitives, not pixels.

## 5. Image strategy

- **Always set `width` and `height` attributes** (prevents CLS).
- Serve **AVIF → WebP → JPEG/PNG** via `<picture>`.
- Use `srcset` + `sizes` for art-direction and density.
- Lazy-load below-the-fold images: `loading="lazy" decoding="async"`.
- Hero images: preload (`<link rel="preload" as="image">`) the LCP candidate.

## 6. Touch + pointer

- Touch targets: **24×24 CSS px minimum** (WCAG 2.5.8); promote to 44×44 for primary CTAs.
- Hover states must have a non-hover equivalent (touch users don't hover).
- Use `@media (hover: hover)` to gate hover-only affordances.

## 7. Dark mode

- Honor `prefers-color-scheme` by default.
- Provide an in-app override stored in `localStorage`.
- Token-driven: every color comes from a semantic token (`--surface`, `--text`, `--accent`), not a raw hex.
- Test contrast in **both** modes.

## 8. Motion

- Honor `prefers-reduced-motion`. Default to motion only when the user opted in or the system says it's OK.
- Durations: 100ms (micro) / 200ms (transition) / 300ms (page-level). Anything > 300ms feels slow.

## 9. Smoke walk before sign-off

Walk every page at: **320px**, **768px**, **1024px**, **1440px**, **portrait/landscape**, plus **200% zoom**. No horizontal scroll. No clipped content. No focus loss.

## 10. Hand-off to Shuri

Specs should reference tokens (`--space-3`, `--step-2`, `--surface-1`) — not raw values. Tony picks the implementation (Tailwind, CSS modules, Vanilla Extract); Shuri implements against the tokens Mantis defined in `.wize/solutioning/design-system/tokens.json`.
