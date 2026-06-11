---
playbook: permissions-ux
owner: wize-agent-ux-designer   # Mantis (paired with Pepper on copy)
applies_when: app-overlay active
status: ready
---

# Permissions UX — Mantis Playbook

The system dialog you can't customize. Everything *around* it is yours. Use it well — denied permissions are usually a UX failure, not a privacy choice.

## 1. The four states for every permission

1. **Not determined** — system never asked.
2. **Granted** — you can use the feature.
3. **Denied** — user said no; system won't re-prompt; only Settings can flip.
4. **Restricted / Limited** — partial access (iOS photos limited library; Android approximate location).

Design **all four** for every permission your app uses.

## 2. The "pre-flight" pattern

Never trigger the system prompt as the first thing the user sees. Always:

1. **In-context trigger.** The user tries a feature that needs the permission.
2. **Mantis pre-flight UI.** A custom screen/sheet explains *why*, *what*, *what happens if no*.
3. **System prompt.** User decides.
4. **Outcome path.** Granted → feature works. Denied → degraded mode; offer Settings deep-link.

```
[user taps "Add photo"]
   ↓
┌────────────────────────────────────┐
│ Why we need your photos            │
│ To attach an image to your post.   │
│ We never upload without confirm.   │
│                                    │
│ [ Not now ]      [ Continue ]      │
└────────────────────────────────────┘
   ↓ Continue
[system prompt — uneditable]
   ↓
Granted → flow continues
Denied → fallback UI + "Open Settings"
```

## 3. Per-permission guidance

### Camera & microphone

- Ask only when the user starts a recording/capture action.
- Pre-flight explains what's recorded, stored, and uploaded.
- If denied: show a permanent banner with "Open Settings" inside the feature; don't auto-re-prompt.

### Photo library

- iOS 14+: **Limited Library is the default**. Embrace it — show a "Manage" button to add more later.
- Android 13+: granular media access (images / video / audio).
- Don't ask for full library if you only need one picker — use `PHPickerViewController` / `Photo Picker` which need **no permission** at all.

### Location

- Pre-flight has a *map screenshot* showing the precision and the purpose ("nearby restaurants" vs "your route").
- Android 12+: approximate location is the default. Justify precise.
- Background location: **only** if the feature truly needs it (delivery, fitness route). Otherwise foreground-only.

### Notifications

- Don't ask at launch. Ask the first time a notification would actually be useful.
- Pre-flight: list the categories you'll use (mention, reminder, marketing). Tie each to a setting in-app.
- Provide per-category opt-in inside the app — match to OS notification channels (Android) / authorization options (iOS).

### Contacts / Calendar / Reminders

- High-friction permission; only when essential.
- If you just need a single contact, use the system picker — **no permission required**.

### Bluetooth / Local Network

- iOS: bluetooth-LE for peripherals only; Local Network for Bonjour discovery — both prompt.
- Pre-flight should explain it's for nearby devices, not internet access.

### Health / Motion (iOS)

- HealthKit asks per data type. Group requests by user-task, not by data field.
- Motion: pre-flight explains it's used for step-count or activity recognition only.

### Tracking (App Tracking Transparency, iOS)

- The system prompt is required if you track across other apps/sites.
- Apple disallows incentivizing the choice; respect it.

## 4. Copy template (Pepper helps phrase)

Pre-flight title: **"Why we need [permission]"**.
One-line value statement.
One-line "what we will not do" (privacy promise).
Two buttons: **Not now** (no permission requested) and **Continue** (triggers system prompt).

Avoid: "Allow Camera Access" (system already says that).

## 5. Denied state UI

Never silently fail. Show:
- The state badge ("Camera access off").
- A one-line reason.
- A direct **"Open Settings"** button.

```swift
// iOS
if let url = URL(string: UIApplication.openSettingsURLString) {
  UIApplication.shared.open(url)
}
```

```kotlin
// Android
startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", packageName, null)))
```

## 6. Settings mirror inside the app

Every permission you request has a corresponding row in **Settings → Permissions** inside the app. Mirrors the OS state, with the same Open Settings deep-link. This is the user's escape hatch.

## 7. Background work

Some Android/iOS background permissions (location, background refresh, BLE in background) require user education and energy disclosure. Pre-flight mentions battery cost explicitly.

## 8. Don'ts

- Multiple prompts on first launch ("camera, mic, location, notifications" in a row). Cardinal sin.
- Re-asking immediately after denial — many OSes block; users get frustrated.
- Using "we can't function without this" as the reason — design for the denied state.
- Pre-flight that already says "tap Allow" — the system dialog handles that. Just convince them *why*.
- Modal blocking UI when the user denies. The feature degrades; the app doesn't.

## 9. Audit list

For every release, Hawkeye verifies in `tea-design.md`:
- Every permission has a pre-flight UI.
- Every permission has a denied-state UI.
- Every permission has a Settings deep-link.
- App functions (degraded) without each non-essential permission.

## 10. Hand-off

Mantis owns flow + copy strings. Pepper polishes copy. Tony picks the entitlement / manifest. Shuri implements; Hawkeye walks the four states (not-asked / granted / denied / limited) per permission.
