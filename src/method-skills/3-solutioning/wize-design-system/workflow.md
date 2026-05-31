---
code: wize-design-system
name: Design System
phase: 3-solutioning
owner: wize-agent-ux-designer   # Mantis (WDS Freya — Phase 7)
absorbs: "WDS Freya — Phase 7 (Design System)"
status: stub
---

# Design System

**Goal.** Establish design tokens and a baseline component library that Shuri implements consistently across the product.

## Inputs
- `.wize/planning/ux/ux-design/`

## Outputs
- `.wize/solutioning/design-system/tokens.json`
- `.wize/solutioning/design-system/components/{Component}.md`
- `.wize/solutioning/design-system/README.md`

## Tokens covered
- color (semantic + raw scale)
- typography (family, sizes, weights, line-heights)
- spacing scale
- radii
- motion (durations, easings)
- shadows / elevation
- z-index layers

## Component baseline
Buttons, inputs, selects, modals, dialogs, tabs, cards, notifications. Enough for the first epic; expand as stories require.

## Overlays
- **Web overlay** active → responsive token variants, REM-based typography.
- **App overlay** active → platform-token sets (iOS / Android), touch-friendly spacing scale.
