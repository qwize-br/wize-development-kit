---
playbook: material-design-3
owner: wize-agent-ux-designer   # Mantis
applies_when: app-overlay active (Android)
status: ready
---

# Material Design 3 (Material You) — Mantis Playbook

M3 is a design system that adapts to the user, not the other way around. Tokens drive everything.

## 1. The four pillars

1. **Personal** — colors derive from user wallpaper (Material You).
2. **Adaptive** — same UI, different layouts on phone / foldable / tablet / desktop.
3. **Expressive** — bigger type, richer motion, branded but readable.
4. **Inclusive** — built-in accessibility floor: contrast tiers, large touch targets, dynamic type.

## 2. Tokens (the only acceptable way to ship styles)

### Color roles

| Role | Use for |
|---|---|
| `primary` | Brand primary action color, FABs, prominent buttons. |
| `onPrimary` | Foreground on `primary`. |
| `primaryContainer` | Tonal surfaces using primary hue. |
| `onPrimaryContainer` | Foreground on `primaryContainer`. |
| `secondary` / `tertiary` | Lower-emphasis accents. |
| `surface` / `surfaceVariant` | Cards, sheets, containers. |
| `surfaceContainer*` (M3) | New tiers: low, mid, high, highest. Use for elevation-by-color. |
| `error` / `onError` | Error states. |
| `outline` / `outlineVariant` | Borders, dividers. |

Never use raw hex. Always tokens. Color is regenerated from the user's seed (dynamic) — hex won't recolor.

### Type scale (M3)

| Token | Use |
|---|---|
| `displayLarge` / `Medium` / `Small` | Hero text, rarely. |
| `headlineLarge` / `Medium` / `Small` | Page-level titles. |
| `titleLarge` / `Medium` / `Small` | Section, dialog titles. |
| `bodyLarge` / `Medium` / `Small` | Body content. |
| `labelLarge` / `Medium` / `Small` | Buttons, chips, captions. |

### Shape

`shape.small` (4dp) / `medium` (12dp) / `large` (16dp) / `extraLarge` (28dp). Cards: medium. Bottom sheets: large. FAB: extraLarge.

### Elevation by color (M3 change)

M3 prefers tonal elevation (surface color tier) over shadow. Use `surfaceContainerLow` → `surfaceContainerHighest` to express depth. Drop shadows are still allowed but secondary.

## 3. Components (a starter set)

| Component | Default | Notes |
|---|---|---|
| Top app bar | Small (default) | Center-aligned, medium, large variants for hero pages. |
| Navigation bar (bottom) | 3–5 destinations | Phones default. |
| Navigation rail | tablets / foldable open | Side rail for medium widths. |
| Navigation drawer | tablets / desktops | Persistent sidebar pattern. |
| FAB | Primary action | 1 per screen max. |
| Extended FAB | Action + label | When the action is non-obvious. |
| Cards | Filled / Outlined / Elevated | Pick one variant per surface family. |
| Chips | Assist / Filter / Input / Suggestion | Match the use-case verb. |
| Buttons | Elevated / Filled / Tonal / Outlined / Text | Pick by hierarchy, not aesthetics. |
| Bottom sheet | Modal (standalone) / Standard (inline) | Standard is the new big M3 pattern. |

## 4. Adaptive layouts

Material breakpoints:

| Window class | Width | Layout |
|---|---|---|
| Compact | < 600dp | Bottom nav, single pane. |
| Medium | 600–839dp | Nav rail, list-detail with detail-on-tap. |
| Expanded | 840–1199dp | Nav rail/drawer, two-pane list-detail. |
| Large | 1200dp+ | Persistent drawer, multi-pane. |

Mantis designs **at minimum compact + expanded**. Tony picks the technique (foldable awareness, window-size-class) for the chosen stack.

## 5. Motion

| Motion | Duration | Easing |
|---|---|---|
| Standard | 300ms | `motion.easingStandard` |
| Emphasized | 500ms | `motion.easingEmphasized` |
| Decelerate | 250ms | for incoming |
| Accelerate | 200ms | for outgoing |

Reduced motion: replace transforms with fades. Test with system "Remove animations" enabled.

## 6. Navigation idioms

- System Back is canonical. Don't reimplement back arrows that conflict with the gesture.
- Predictive back (Android 14+) needs `OnBackInvokedCallback` to preview the destination.
- Avoid hamburger menus on phones — use bottom nav.

## 7. Accessibility floor

- Touch targets: **48×48 dp minimum** (HIG-equivalent rule).
- Talkback labels on every actionable element.
- `contentDescription` for icons-without-text.
- Dynamic type via `sp` (never `dp` for text). Support 130% font scale.
- Contrast follows WCAG AA tokens; M3 tooling validates contrast pairs by default.

## 8. Theming with Material You

If the project allows wallpaper-derived theming:

```kotlin
// Compose
val dynamicColors = if (Build.VERSION.SDK_INT >= 31)
  dynamicColorScheme(LocalContext.current) else darkColorScheme()
MaterialTheme(colorScheme = dynamicColors) { /* ... */ }
```

For brand-locked apps, ship a fixed seed but stay in tokens; this preserves accessibility-tier behavior.

## 9. Don'ts

- Hex colors in components.
- Ignoring tonal elevation in favor of shadow.
- Bottom nav with > 5 items (use scrollable tabs instead).
- One FAB per app bar action (rate-limit to one FAB).
- Dialogs for non-blocking confirmations (use snackbar with undo).

## 10. Cross-platform note

If iOS is shipped too: do not port Material to iOS, and vice versa. The Mantis design system separates **brand tokens** (shared) from **platform tokens** (per-OS). See `apple-hig.md`.

## 11. Hand-off

Mantis annotates screens with Material component names and tokens (`md.sys.color.primary`, `md.sys.typescale.titleLarge`). Tony picks Compose / View system / cross-platform (Flutter, RN). Shuri implements against the component+token contract.
