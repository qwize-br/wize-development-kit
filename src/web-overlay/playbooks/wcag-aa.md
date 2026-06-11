---
playbook: wcag-aa
owner: wize-agent-ux-designer   # Mantis
applies_when: web-overlay active
status: ready
---

# WCAG 2.2 AA — Mantis Playbook

Use this when you're shaping UX and need a concrete accessibility floor. Treat AA as the **minimum**; promote items to AAA when the product audience demands it (e.g., gov, healthcare).

## 1. Quick principles (POUR)

| Principle | What it means | Most-broken in the wild |
|---|---|---|
| **Perceivable** | Content can be seen/heard by everyone. | Color contrast, alt text. |
| **Operable** | UI works with keyboard + assistive tech. | Focus traps, no-skip nav. |
| **Understandable** | Predictable, error-tolerant. | Form errors with no explanation. |
| **Robust** | Works across browsers and ATs. | Custom controls without ARIA roles. |

## 2. Mandatory AA checklist for every screen

### Perceivable
- [ ] Text contrast **≥ 4.5:1** (normal) / **≥ 3:1** (large ≥ 18pt / 14pt-bold).
- [ ] Non-text UI (icons, focus rings, form borders) contrast **≥ 3:1** against background.
- [ ] Every `<img>` has `alt`; decorative images use `alt=""` + `aria-hidden`.
- [ ] Video has captions; audio-only content has a transcript.
- [ ] Don't convey meaning by color alone (error = red + icon + label).
- [ ] Page works at **200% zoom** without loss of content or function.

### Operable
- [ ] **Every interactive element is reachable and operable by keyboard.** Tab order matches visual order.
- [ ] Visible focus indicator (≥ 3:1 contrast) on **all** focusable elements. Don't override with `outline:none` without replacement.
- [ ] "Skip to main content" link is the first focusable element on the page.
- [ ] No keyboard trap. `Esc` closes modals; modals trap focus *within* the modal until closed.
- [ ] Touch targets ≥ **24×24 CSS px** (WCAG 2.2 SC 2.5.8). Promote to 44×44 for primary actions.
- [ ] No motion-triggered actions without a non-motion fallback.
- [ ] User can pause/stop/hide content that auto-plays > 5s.

### Understandable
- [ ] `lang` attribute set on `<html>` (and on inline lang switches).
- [ ] Form fields have **persistent, visible labels** (not placeholder-only).
- [ ] Required fields marked with text + visual cue (not asterisk alone).
- [ ] Error messages: identify the field, describe the fix, link back to the input.
- [ ] Consistent navigation across pages (same links in same order).

### Robust
- [ ] Use semantic HTML before reaching for ARIA. (See `semantic-html.md`.)
- [ ] Custom widgets have proper ARIA role + state + value.
- [ ] No duplicate IDs on a page.
- [ ] Status messages (toasts, async results) announced via `role="status"` or `aria-live="polite"`.

## 3. WCAG 2.2 specifics (newer SCs to remember)

| SC | Topic | Practical implication |
|---|---|---|
| 2.4.11 | Focus not obscured (minimum) | Sticky headers/footers must not cover the focused element. |
| 2.5.7 | Dragging movements | Anything drag-only needs a non-drag alternative. |
| 2.5.8 | Target size (minimum) | 24×24 CSS px (excluding ample spacing). |
| 3.2.6 | Consistent help | Help link in the same relative location across pages. |
| 3.3.7 | Redundant entry | Don't ask the user to retype info already submitted in the same session. |
| 3.3.8 | Accessible authentication | Don't require cognitive function tests for login (no "type these letters" puzzles). |

## 4. Tools to run (every PR that touches UI)

| Tool | What it catches | Notes |
|---|---|---|
| **axe DevTools** (browser ext) | ~57% of WCAG issues automatically. | First line. Free. |
| **Lighthouse → Accessibility** | Subset of axe; ships in Chrome. | CI-friendly. |
| **pa11y / pa11y-ci** | Headless audit in pipelines. | Add to PR check. |
| **NVDA** (Windows) or **VoiceOver** (Mac/iOS) | Manual screen reader pass. | At least the critical flows. |
| **Keyboard-only walk** | Focus order, traps, hidden controls. | 5 minutes per screen. |

## 5. Common patterns Mantis ships with

- **Skip link:** first focusable element, hidden visually until focused.
- **Form pattern:** `<label>` always visible, error region with `aria-live="polite"` next to each input.
- **Modal:** `role="dialog" aria-modal="true"`, focus trapped, focus restored to opener on close.
- **Disclosure/Accordion:** `<button aria-expanded>` toggling a `<div id>`; not raw `<div onclick>`.
- **Toast:** `role="status"`, dismiss-on-press + auto-dismiss after ≥ 10s for readers.
- **Async loading:** announce via `aria-live="polite"`, never silent.

## 6. Hand-off note for Tony and Shuri

Tony, when picking a component library, evaluate it on:
- Real focus indicators (not just outline override).
- Form components that ship labels + error regions out of the box.
- Modals that handle focus return.

Shuri, when implementing, **never delete the focus ring** without replacing it with a custom one of equal contrast. Every PR touching UI runs axe + a keyboard walk.

## 7. When AA isn't enough

Promote to AAA when:
- Product targets users with low vision (consider 7:1 contrast).
- Public-sector or healthcare deployment.
- Compliance (Section 508, EN 301 549, ADA).
