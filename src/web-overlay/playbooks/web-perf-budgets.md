---
playbook: web-perf-budgets
owner: wize-agent-test-architect   # Hawkeye (with Tony on stack picks)
applies_when: web-overlay active
status: ready
---

# Web Performance Budgets — Hawkeye Playbook

Budgets are decisions, not measurements. Set them once, enforce them on every PR.

## 1. Core Web Vitals — the floor

| Metric | Good | Needs work | Poor |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | 2.5–4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | ≤ 200ms | 200–500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.1–0.25 | > 0.25 |

Measure on **mobile, slow 4G, mid-range device** — not your laptop on fiber.

## 2. Baseline budgets (mid-range mobile, 3G fast)

| Resource | Budget | How to enforce |
|---|---|---|
| **Total transferred** (initial route) | ≤ 200 KB compressed | `lighthouse-ci` budget. |
| **JS** | ≤ 100 KB compressed (≤ 300 KB uncompressed) | Bundle analyzer + CI check. |
| **CSS** | ≤ 30 KB | Critical-CSS inlined; rest deferred. |
| **Images (above the fold)** | ≤ 100 KB total | AVIF/WebP, `<picture>`. |
| **Fonts** | ≤ 30 KB (2 weights subset) | `font-display: swap`, preload. |
| **Third-party requests** | ≤ 5 | Audit on every release. |

These are starting points. Tony tunes them per project after the PRD nails the audience and target device.

## 3. JS budget — what eats it

- Framework runtime (React: ~50 KB gz, Vue: ~30 KB, Svelte: 0 KB at runtime).
- Router.
- State manager.
- Date library (date-fns ≪ moment).
- Form library.
- UI components from `node_modules`.

Audit with `npx vite-bundle-visualizer` (Vite) or `next-bundle-analyzer` (Next). Remove the top 3 by size every quarter.

## 4. Image strategy

1. **Format:** AVIF first → WebP → JPEG/PNG fallback.
2. **Width:** never serve more than 2× the rendered CSS width.
3. **Lazy:** below-the-fold = `loading="lazy"`. LCP image = `<link rel="preload" as="image">`.
4. **Dimensions:** always set `width` and `height` HTML attrs to prevent CLS.
5. **Responsive:** `<picture>` with `srcset` + `sizes`, or a framework-native `<Image>`.

## 5. Font strategy

- Self-host. Don't fetch from CDN for performance work.
- Subset to the characters you actually use (Glyphhanger / fonttools).
- `font-display: swap` so text appears instantly.
- Preload the primary font; defer secondaries.
- Cap variable fonts at 2 axes.

## 6. Third parties (the silent killers)

For every third-party script, answer:

1. **What user value does it deliver?**
2. **Can it load after `load` event?** (analytics, A/B, chat)
3. **Can it load only on interaction?** (chat widgets, video embeds)
4. **Has it been replaced by a smaller alternative?** (e.g., Plausible vs GA)
5. **Is it sandboxed in a `<iframe>` or web worker?**

Audit list in `.wize/planning/web/perf-budget.md`. Remove or defer one every release until they all justify their bytes.

## 7. Critical rendering path

```
<head>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="image" href="/hero.avif" type="image/avif">
  <link rel="preload" as="font" type="font/woff2" href="/fonts/Inter.var.woff2" crossorigin>
  <style>/* critical above-the-fold CSS, ≤ 14 KB */</style>
  <link rel="stylesheet" href="/main.css" media="print" onload="this.media='all'">
</head>
```

- Critical CSS inline (≤ 14 KB so the first packet contains it).
- Everything else deferred or preloaded.
- No render-blocking external scripts above content.

## 8. INP — interaction responsiveness

INP measures **the slowest interaction** a user has across the session, not the average. One bad input handler ruins your score.

Hot fixes:
1. Yield to the main thread inside long handlers (`await scheduler.yield()` or `setTimeout(0)`).
2. Move heavy work to a worker (`react-server-components`, `comlink`).
3. Debounce typing-driven recalculations.
4. Use `<input type=*` natives; custom inputs are slower.
5. Defer hydration (Astro Islands, Qwik, React Server Components).

## 9. Build-time enforcement

```jsonc
// lighthouserc.json (lighthouse-ci)
{
  "ci": {
    "collect": {
      "url": ["https://staging.example.com/", "https://staging.example.com/dashboard"],
      "settings": { "preset": "perf" }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-byte-weight": ["error", { "maxNumericValue": 250000 }]
      }
    }
  }
}
```

Wire into CI; gate merges on perf score.

## 10. Field measurement

Lab tests catch obvious regressions; field tests catch the truth. Add a Web Vitals beacon:

```ts
import { onLCP, onINP, onCLS } from 'web-vitals';
const beacon = (m: any) => navigator.sendBeacon('/v', JSON.stringify(m));
onLCP(beacon); onINP(beacon); onCLS(beacon);
```

Aggregate by route + device class + connection in your analytics. Look at p75, not avg.

## 11. Hand-off

For every epic, Hawkeye attaches an NFR report (`tea/nfr/{epic}.md`) with current vs target Core Web Vitals. Fury sets the targets in `nfr-principles.md`. Tony picks the stack mindful of the runtime cost ahead of time, not afterward.
