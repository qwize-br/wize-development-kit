---
playbook: apple-hig
owner: wize-agent-ux-designer   # Mantis
applies_when: app-overlay active (iOS / iPadOS / macOS)
status: ready
---

# Apple HIG — Mantis Playbook (iOS / iPadOS)

The HIG isn't a rulebook to memorize — it's a vocabulary. Design so the app feels native first, branded second.

## 1. The four design principles to lead with

1. **Hierarchy** — one primary action per screen. Demote everything else.
2. **Harmony** — visual language aligned with the system: SF Symbols, system colors, dynamic type.
3. **Consistency** — same gesture, same outcome, across the app.
4. **Deference** — content over chrome; let the OS chrome breathe.

## 2. Layout fundamentals

| Region | Rule |
|---|---|
| Status bar | Never overlap critical content. Match content scheme (light/dark). |
| Navigation bar | Use the system component. Title sits in `Large Title` on top, collapses on scroll. |
| Tab bar | 3–5 tabs. Each is a top-level destination, not a flow step. |
| Safe area | Always respect; never paint behind home indicator unless intentional. |
| Touch targets | **44×44 pt minimum** (HIG SC). Spacing ≥ 8 pt between adjacent targets. |

## 3. Navigation patterns

| Pattern | Use when |
|---|---|
| **Tab bar** | 3–5 distinct content areas (Home/Search/Library/Profile). |
| **Navigation stack** | Hierarchical drill-down. Back gesture must work. |
| **Modal sheet** | Self-contained task (compose, settings detail). Dismissible with swipe-down. |
| **Full-screen modal** | Multi-step task that needs focus (onboarding, payment flow). |
| **Page sheet** (iPad) | Inspector-like UI alongside content. |
| **Popover** (iPad/Mac) | Contextual options anchored to a control. |

## 4. SF Symbols (use them)

- 6000+ glyphs with weights, hierarchical variants, and palette modes.
- Match symbol weight to your text weight.
- Use multicolor sparingly — only when meaning depends on color.
- Never embed glyphs as PNG; SwiftUI/UIKit handle scaling.

```swift
Image(systemName: "heart.fill")
  .font(.system(size: 24, weight: .semibold))
  .foregroundStyle(.tint)
```

## 5. Typography — Dynamic Type

- Use semantic text styles (`.title`, `.headline`, `.body`, `.callout`, `.footnote`). Never hardcode `font-size`.
- Support all 7 default text sizes and the 5 accessibility sizes (xxxL → A11Y_XXXL).
- Test at the largest accessibility size: critical UI must reflow, not clip.

## 6. Color

- Start from **system colors** (`.label`, `.systemBackground`, `.systemBlue`). They handle light/dark/contrast.
- Brand color stays as a single accent (`tintColor`). Don't recolor system controls.
- Run in dark mode + Increase Contrast + Reduce Transparency at least once per epic.

## 7. Motion

- Respect `Reduce Motion`. Replace `slide`/`scale` with `cross-fade`.
- Standard durations: 0.25s (transient), 0.35s (navigation), 0.4s (modal present).
- Springs over linear curves; physics > eased linear.

## 8. Common idioms

| Idiom | When |
|---|---|
| **Pull-to-refresh** | Lists where freshness matters (mail, feed). |
| **Swipe actions** | Quick row actions (archive, delete). Always pair with a tap-reveal alternative. |
| **Context menu (long press)** | Secondary actions on a tile. Never the only path. |
| **Action sheet** | 2–6 mutually exclusive choices on a small screen. |
| **Confirmation dialog** | Destructive actions — always confirm; phrase the verb on the button. |

## 9. Permissions

- Ask in context, not at launch. (See `permissions-ux.md`.)
- Provide a pre-flight UI explaining the *why* before the system prompt.

## 10. Privacy nutrition + tracking

- `App Tracking Transparency` prompt is mandatory if you track across other apps/sites.
- Privacy nutrition label is required on the App Store.
- Mantis writes the user-facing explanations; Tony coordinates the technical entries.

## 11. iPad specifics

- **Sidebar + content split** when content is hierarchical and lateral nav matters.
- Support Stage Manager + multitasking (responsive layout, no fixed pixel widths).
- Apple Pencil hover (iPad Pro) — design hover affordances even for touch-only apps.

## 12. Don'ts

- Custom back arrows. Use the platform's.
- Hidden gestures as the only path to a feature. Provide a visible tap.
- Splash screen with branding for > 1 second. Use the launch screen, not a "loading" splash.
- Reinventing the share sheet. Use `UIActivityViewController` / `ShareLink`.
- Toast notifications. iOS doesn't have them; use sheets, banners, or system notifications.

## 13. Cross-platform note

If the project also ships Android, **build to platform**, not lowest common denominator. Each idiom (back button vs back gesture, tab bar vs bottom nav, alert vs dialog) belongs to its OS. See `material-design-3.md`.

## 14. Hand-off

Mantis annotates each screen spec with the Apple system component name (`UIKit` or `SwiftUI`), Dynamic Type style, system color tokens. Tony picks UIKit vs SwiftUI vs React Native; Shuri implements against the named components.
