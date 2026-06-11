---
playbook: touch-targets-and-gestures
owner: wize-agent-ux-designer   # Mantis
applies_when: app-overlay active
status: ready
---

# Touch Targets & Gestures — Mantis Playbook

The thumb is the cursor. Design every screen around how it actually reaches the controls.

## 1. Minimum touch target sizes

| Platform | Minimum | Recommended primary |
|---|---|---|
| **iOS** (HIG) | 44×44 pt | 48×48+ pt for primary CTAs |
| **Android** (Material) | 48×48 dp | 56×56 dp for FABs |
| **Web** (WCAG 2.5.8) | 24×24 CSS px | 44×44 CSS px for primary |

If a visible glyph must be smaller (icon-only toolbar), expand the **hit area** via padding or `hitSlop` — the visual icon stays small but the touch is large.

```swift
// SwiftUI hit area
Button { /* */ } label: { Image(systemName: "star") }
  .contentShape(Rectangle())
  .frame(minWidth: 44, minHeight: 44)
```

```kotlin
// Compose
Modifier.minimumInteractiveComponentSize() // ≥ 48dp
```

```jsx
// React Native
<Pressable hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>...</Pressable>
```

## 2. Spacing between adjacent targets

- **≥ 8 dp/pt** between adjacent interactive elements.
- Bottom row of nav must clear the home indicator (iOS) / gesture region (Android).

## 3. Thumb reach zones (one-handed use)

Three zones, on a 6.1" phone:

| Zone | Region | Use for |
|---|---|---|
| **Easy** | Bottom 1/3 | Primary actions, nav. |
| **OK** | Middle 1/3 | Secondary, content tap. |
| **Hard** | Top 1/3 | Status, branding, low-frequency. |

Put destructive or rarely-used controls in the **Hard** zone. Put the primary CTA in **Easy**.

## 4. Standard gestures (use the system's vocabulary)

| Gesture | Reserved meaning |
|---|---|
| **Tap** | Default action. |
| **Long press** | Reveal secondary actions / context menu. Optional path — never the only one. |
| **Swipe left/right on row** | Quick actions (archive, delete). |
| **Swipe down on modal** | Dismiss. |
| **Pull down on list** | Refresh. |
| **Pinch** | Zoom (content). |
| **Two-finger drag** | Multi-select (mac/iPad). |
| **Edge swipe (iOS)** | Back navigation. |
| **System back gesture (Android)** | Back; **don't** intercept lightly. |

## 5. Custom gestures — pick wisely

If you must invent a gesture:

1. **Don't make it the only path.** Pair with a visible tap affordance.
2. **Onboard once.** Show the gesture on first launch; never again.
3. **Make it cancellable.** Mid-gesture the user must be able to abort.
4. **Don't fight system gestures.** Edge swipes on iOS = back; you'll lose.
5. **Test with system Voice Control** (iOS) / Switch Access (Android) — discoverable to users who can't gesture.

## 6. Multi-touch caveats

- iOS: `MultipleTouchEnabled = true` per view; default is single.
- Android: track pointer IDs on every event; don't assume one finger.
- Two-finger gestures (pinch, rotate) need an alternative for users with motor limitations — usually a button.

## 7. Drag-and-drop

| Platform | Native |
|---|---|
| iOS | `UIDragInteraction` / SwiftUI `.draggable + .dropDestination` |
| Android | `View.startDragAndDrop` / Compose `dragGestures` |
| React Native | community lib (e.g., `react-native-draggable-flatlist`) |

Drag-and-drop must:
- Show a visible drag preview.
- Highlight valid drop targets.
- Support keyboard equivalent (or selection + "Move to…") for accessibility (WCAG 2.5.7).

## 8. Haptics

| Use | Pattern |
|---|---|
| Successful confirmation | Light impact (.light / `VibrationEffect.EFFECT_TICK`) |
| Failure / invalid | Notification error / double tick |
| Long-press triggered | Selection change |
| Pull-to-refresh release | Light impact |

Haptics are noise without a system event behind them. Don't trigger them on every tap.

## 9. Reduce Motion / Reduce Transparency

Reduce gesture-driven motion: replace swipe-to-reveal animations with simple cross-fades. Detect with:

- iOS: `UIAccessibility.isReduceMotionEnabled`
- Android: `Settings.Global.TRANSITION_ANIMATION_SCALE`

## 10. Don'ts

- Targets smaller than the platform minimum, even if "the icon is small".
- Hover-only affordances (no hover on touch).
- Gestures that conflict with system gestures (edge swipes, pull-from-top).
- Long-press-only access to a critical feature.
- "Discover this gesture by trial" — onboarding it costs less than the support tickets.

## 11. Hand-off

Mantis annotates every interactive element with: `hit area`, `gesture`, `haptic`, `state on disabled`. Shuri implements; Hawkeye verifies hit-area sizes in `tea-design.md` using device-pixel measurements.
