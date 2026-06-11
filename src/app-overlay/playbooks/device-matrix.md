---
playbook: device-matrix
owner: wize-agent-test-architect   # Hawkeye
applies_when: app-overlay active
status: ready
---

# Device Matrix — Hawkeye Playbook

You can't test on every device. You can test on the right ones. Decide the matrix once per release; rotate quarterly.

## 1. The three buckets

Every release ships on three device classes:

| Bucket | Why |
|---|---|
| **Floor** (oldest supported / lowest-spec) | Performance & memory pressure catches regressions invisible on flagship. |
| **Volume** (most-used by your audience) | Where users actually live. Drive default UX decisions here. |
| **Ceiling** (latest flagship + newest OS) | New-feature opportunity (Live Activities, Predictive Back, etc.) + verify no flagship-only assumption breaks. |

## 2. iOS matrix (2026, generic SaaS audience)

| Bucket | Device | iOS | Notes |
|---|---|---|---|
| Floor | iPhone SE (2nd gen, A13) | iOS 17 | 4.7" non-Retina XDR, no Dynamic Island. |
| Floor | iPhone 11 | iOS 17 | Wide audience tail. |
| Volume | iPhone 14 | iOS 18 | Mid-range volume sweet spot. |
| Volume | iPhone 15 | iOS 18 | Dynamic Island, USB-C. |
| Ceiling | iPhone 17 Pro | iOS 26 (current dev) | ProMotion, latest APIs. |
| iPad floor | iPad (10th gen) | iPadOS 17 | Non-ProMotion. |
| iPad ceiling | iPad Pro M4 | iPadOS 18 | Stage Manager, hover, Pencil hover. |

**Min OS:** iOS 17 (cuts ~5% of installed base; recovers a lot of API surface). Adjust per audience.

## 3. Android matrix (2026, generic SaaS audience)

| Bucket | Device | OS | Notes |
|---|---|---|---|
| Floor | Pixel 6a or Samsung A14 | Android 13 | 4 GB RAM, Snapdragon 6-series. |
| Volume | Samsung Galaxy A55 | Android 14 | Mid-range. Big volume in emerging markets. |
| Volume | Pixel 8 | Android 14 / 15 | Reference device for API behavior. |
| Ceiling | Pixel 9 Pro / Galaxy S25 Ultra | Android 15 | Foldable / large-screen, edge gestures. |
| Foldable | Samsung Galaxy Z Fold 6 | Android 14 / 15 | Adaptive layout signal. |
| Tablet | Pixel Tablet | Android 14 | Window-size-class testing. |

**Min OS:** Android 13 (API 33) — covers ~85% of active devices. Verify via Play Console statistics for your audience.

## 4. Hybrid / web-in-app matrix

If the app uses webviews (Capacitor, Ionic, embedded web docs):

- iOS: WKWebView (always system Safari engine).
- Android: System WebView (Chromium-based, updated separately). Test on **last 3 Chromium versions**.

## 5. Choosing the volume tier

Don't guess. Pull from:

- **App Store Connect → Analytics → Sources → Devices** (after release).
- **Google Play Console → Statistics → Devices**.
- For pre-release: pick the top 3 devices in your target market via StatCounter / DeviceAtlas / Crashlytics-baseline market data.

Rotate volume devices every two quarters as field data shifts.

## 6. How to run the matrix in CI

### Cloud farms

| Provider | iOS | Android | Notes |
|---|---|---|---|
| BrowserStack App Live / Automate | ✓ | ✓ | Largest catalog; integrates Detox + Maestro. |
| Sauce Labs Mobile | ✓ | ✓ | Strong on Appium; price ladder. |
| Maestro Cloud | ✓ | ✓ | YAML-native; visual diff included. |
| Firebase Test Lab | (limited) | ✓ | Android-first; cheap, large. |
| AWS Device Farm | ✓ | ✓ | Real devices; AWS billing. |
| LambdaTest | ✓ | ✓ | Mid-tier price. |

### Local

- iOS: Xcode simulators for development; **at least one real device per bucket** before release.
- Android: emulators (`avdmanager` + `system-images;android-34;google_apis;x86_64`); real device per bucket.

### What runs where

- **Every PR:** smoke flow (Maestro) on emulator iOS + Android (volume bucket).
- **Every merge to main:** full smoke matrix (floor + volume + ceiling).
- **Nightly:** full E2E suite (Detox + Maestro) on real devices via cloud farm.
- **Weekly:** perf benchmark suite (cold start, memory, FPS) on the floor + volume buckets.

## 7. Accessibility runs

Add to the device matrix:

- iOS: VoiceOver + Dynamic Type at largest accessibility size.
- Android: TalkBack + 130% font scale.
- Color contrast checks at the OS level (Smart Invert / Dark Mode forced).
- Switch Control (iOS) / Switch Access (Android) on the most-used flow.

## 8. Network conditions

Hawkeye samples network at:

| Condition | Tool |
|---|---|
| Offline | Airplane mode flag in CI. |
| 3G slow | Charles / Proxyman / Maestro `setProxy` + bandwidth throttle. |
| Lossy WiFi | `tc qdisc` on Linux runner; Network Link Conditioner on Mac. |
| Captive portal | Manual on weekly cycle. |

A surprising % of production crashes come from network edge cases. Cover at least offline + slow.

## 9. Locale

- Always test **English + the two largest non-English locales** for the audience.
- RTL (Arabic or Hebrew) at least once per release if the app ships in those markets.
- Date / number / currency formatting in the relevant locales.

## 10. Hand-off

The device matrix lives at `.wize/planning/app/device-matrix.md` once Mantis + Tony agree on the audience. Hawkeye references it in every `tea-design.md`; CI configs (Maestro / Detox / BrowserStack) read the same matrix to avoid drift.
