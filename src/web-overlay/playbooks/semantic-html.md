---
playbook: semantic-html
owner: wize-agent-ux-designer   # Mantis (with Tony for component patterns)
applies_when: web-overlay active
status: ready
---

# Semantic HTML — Mantis Playbook

The first rule: **use the right element**. ARIA is for when the platform doesn't ship the element you need; it is not a substitute for `<button>`.

## 1. Landmarks (one per page, usually)

| Element | Role | Purpose |
|---|---|---|
| `<header>` (top-level) | `banner` | Site/app chrome. |
| `<nav>` | `navigation` | Primary nav. Label multiples with `aria-label`. |
| `<main>` | `main` | Unique main content. One per page. |
| `<aside>` | `complementary` | Related-to-main content. |
| `<footer>` (top-level) | `contentinfo` | Site/app footer. |
| `<search>` (HTML 2024) | `search` | Search regions. |

Screen reader users navigate by landmarks. Use them; label duplicates.

## 2. Headings

- One `<h1>` per page (the page topic).
- Headings define **structure**, not size. Never skip levels for style — adjust style with CSS.
- Sections that need their own heading use `<section>` with `aria-labelledby` pointing at the heading.

## 3. The 12 elements you must reach for first

| Need | Element | Why not the alternative |
|---|---|---|
| Clickable action | `<button>` | `<div onclick>` has no keyboard, no focus, no role. |
| Navigation link | `<a href>` | `<button>` doesn't open URLs; routers should still hit `<a>`. |
| Form field | `<input>`/`<textarea>`/`<select>` with `<label>` | DIY inputs lose autofill, IME, mobile keyboards. |
| Yes/No state | `<input type="checkbox">` | Toggles aren't divs. |
| List of things | `<ul>`/`<ol>`/`<li>` | Readers announce count and position. |
| Tabular data | `<table>` with `<thead>`/`<th scope>` | Real semantics for real data. (Not for layout.) |
| Disclosure | `<details>`/`<summary>` | Built-in keyboard + state. |
| Modal | `<dialog>` with `.showModal()` | Focus trap + Escape are free. |
| Tooltips | `<button aria-describedby>` + visible region | Hover-only tooltips fail touch + keyboard. |
| Date input | `<input type="date">` (when locale-OK) | Native pickers feel right on mobile. |
| Range | `<input type="range">` | Keyboard arrows + ARIA are built in. |
| Progress | `<progress>` / `<meter>` | Semantic value + max. |

## 4. Forms — the contract

```html
<form>
  <div class="field">
    <label for="email">Email address</label>
    <input id="email" name="email" type="email" autocomplete="email"
           required aria-describedby="email-help email-error">
    <p id="email-help">We'll never share your email.</p>
    <p id="email-error" role="alert" hidden>Please enter a valid email.</p>
  </div>
  <button type="submit">Sign up</button>
</form>
```

Rules:
1. Label is **always visible** (not placeholder-only).
2. `autocomplete` on every input that has a meaningful value.
3. `required` + a `aria-describedby` error region.
4. Error region uses `role="alert"` or `aria-live="assertive"` only at submit; live regions on every keystroke are noisy.
5. Submit triggers via `Enter` automatically when inside `<form>` — keep it that way.

## 5. ARIA — when (rarely) to use it

Use ARIA only when:
- You can't use the native element (rare).
- You're building a widget HTML doesn't ship (combobox, treeview, slider with custom track).

The five ARIA rules:
1. **Don't** use ARIA if native works.
2. Don't change native semantics with `role` unless you must.
3. All ARIA controls must be keyboard accessible.
4. Don't use `role="presentation"` on focusable elements.
5. Interactive elements must have an accessible name.

## 6. Common widget patterns (with minimum ARIA)

| Widget | Native option | Custom shape (minimum) |
|---|---|---|
| Accordion | `<details>`/`<summary>` | `<button aria-expanded aria-controls="id">` + `<div id="id" hidden>`. |
| Tabs | — (no native) | `role="tablist"` > `role="tab" aria-selected aria-controls` ; `role="tabpanel" aria-labelledby`. |
| Combobox | `<input list>` for simple | ARIA 1.2 combobox pattern; non-trivial. Use a tested lib. |
| Toggle | `<input type="checkbox">` with switch styling | `<button role="switch" aria-checked>`. |
| Toast | — | `role="status" aria-live="polite"` (info); `role="alert"` (errors). |
| Tooltip | `title` (limited) | `<button aria-describedby="tip">` + `<div role="tooltip" id="tip">`. |
| Modal | `<dialog>` | `role="dialog" aria-modal="true" aria-labelledby`; focus trap; restore focus on close. |
| Menu | — | `role="menu"` > `role="menuitem"` ; arrow keys + Escape; rarely needed for app UIs. |

## 7. Lint and audit

- **eslint-plugin-jsx-a11y** for React/JSX projects.
- **eslint-plugin-vuejs-accessibility** for Vue.
- **axe-core** at runtime (browser ext + CI).
- **Manual screen-reader walk** on critical flows before each major release.

## 8. Don'ts (most common in the wild)

- `<div onclick>` instead of `<button>`.
- `outline: none` on `:focus` without replacement.
- Placeholders as labels.
- Icon-only buttons without `aria-label` (or visible text).
- `aria-label` on a `<div>` that isn't interactive (does nothing).
- `tabindex` > 0 (breaks focus order).

## 9. Hand-off

When Mantis writes UX specs, every interactive element is named with its **HTML element name**, not its style ("button: Continue", not "blue rectangle"). This forces semantic discussion upstream of CSS.
