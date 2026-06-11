---
playbook: mobile-perf-budgets
owner: wize-agent-test-architect   # Hawkeye (with Tony for platform tuning)
applies_when: app-overlay active
status: ready
---

# Mobile Performance Budgets — Hawkeye Playbook

Mobile users measure your app in milliseconds and megabytes. Budgets are how you protect both.

## 1. The numbers that matter

| Metric | Good | Needs work | Poor |
|---|---|---|---|
| **Cold start** (launch → first frame) | < 1.5s | 1.5–2.5s | > 2.5s |
| **Warm start** | < 0.8s | 0.8–1.5s | > 1.5s |
| **Time to interactive** (TTI) | < 2.0s | 2.0–3.5s | > 3.5s |
| **Frame rate** (sustained) | 60 fps stable | drops < 5/sec | drops > 5/sec |
| **Jank** (frames > 16ms) | < 0.5% | 0.5–2% | > 2% |
| **App size** (download) | < 50 MB | 50–150 MB | > 150 MB |
| **App size** (installed) | < 200 MB | 200–500 MB | > 500 MB |
| **Memory** (steady-state) | < 150 MB | 150–300 MB | > 300 MB |
| **Battery drain** (per hour, foreground) | < 5% | 5–10% | > 10% |

Targets for **mid-range phones, not your flagship**. Hawkeye runs benchmarks on the device matrix (see `device-matrix.md`).

## 2. App size budget

### Per-platform ceiling

- iOS App Store: 200 MB OTA download cellular ceiling. Plan for **< 150 MB** to leave headroom.
- Google Play: 150 MB APK ceiling; use App Bundle splits. Plan for **< 30 MB** initial download.

### Where size goes

Audit on every release:

| Slice | Tool |
|---|---|
| RN / Expo JS bundle | `metro-visualizer`, `react-native-bundle-visualizer` |
| Native deps | Xcode Linker map / Android Studio APK Analyzer |
| Assets (images, fonts, video) | Compare to design tokens — anything unused? |
| Third-party SDKs | Each SDK > 1 MB needs a written justification |

### Reductions that work

1. **Vector over bitmap** wherever the design allows (PDF for iOS asset catalog, VectorDrawable for Android).
2. **WebP/AVIF over PNG** for bitmaps.
3. **Subset fonts**; ship one weight, derive others via OS faux-bold when acceptable.
4. **Tree-shake JS bundle** (Hermes, ProGuard/R8). Verify with the visualizer.
5. **App Thinning** (iOS) and **App Bundle splits** (Android) so each user downloads only their architecture/density.
6. **On-demand resources** (iOS) / **Play Asset Delivery** (Android) for content not needed at launch.

## 3. Cold start

Cold start is dominated by:

1. **Process launch** — Apple/Google control, but linking and dyld matter (fewer, smaller binaries help).
2. **Framework init** — every SDK initialized in `application(_:didFinishLaunching)` adds to it. Defer non-essential to first-screen-rendered.
3. **First view render** — keep the launch screen → first interactive screen path empty of heavy work.

### Patterns

- Lazy-init analytics, crash reporting, ad SDKs, A/B testing — after first frame.
- Pre-render the first screen's skeleton; populate from cache; refresh in background.
- For RN/Expo: enable **Hermes** + **bundleAssetName splitting**.
- For Android: keep Application.onCreate empty; init via lifecycle observer.

### Measurement

| Platform | Tool |
|---|---|
| iOS | Xcode Instruments → "App Launch", Time Profiler |
| Android | Macrobenchmark library (Jetpack) for ColdStartup. `adb shell am start -W` for rough numbers. |
| RN | `Performance.now()` markers + Flipper Perf plugin. |

## 4. Frame rate & jank

60 fps = 16.67ms/frame. 120 fps target on ProMotion / 90 Hz Androids = 8.33ms.

### Common culprits

- **Layout thrashing** — measuring layout inside scroll/animation handlers.
- **Image decoding on main thread** — decode async, cache decoded.
- **Synchronous bridge calls (RN)** — batch updates, use native modules.
- **Heavy `onLayout` / `LaunchedEffect` on each render**.
- **Re-rendering large lists** — use `FlatList` with `keyExtractor` + `getItemLayout`, or `LazyColumn`.

### Measurement

- iOS: Instruments → Core Animation → FPS.
- Android: GPU profiling overlay + Macrobenchmark FrameTimingMetric.
- RN: Flipper Perf, `react-native-performance`.

## 5. Memory

- Aim for steady-state **< 150 MB** on mid-range.
- Audit images caches; cap at `min(50 MB, 100 thumbnails)`.
- Release video / audio assets on pause.
- Watch out for retain cycles (iOS) and Activity / Fragment leaks (Android) — use LeakCanary / Xcode memory graph.

## 6. Battery

- Don't poll. Use OS push (silent push), BLE listeners (low-power), location updates with low frequency.
- Background tasks: respect the OS budget (BGTaskScheduler / WorkManager).
- Avoid wake-locks; trade off freshness for energy.

## 7. Network

- HTTP/2 minimum; HTTP/3 where supported.
- gzip / brotli on responses.
- Aggressive cache headers; SWR (stale-while-revalidate) pattern for read-heavy data.
- Image CDN with on-the-fly format/quality negotiation.
- Don't fan out 30 small requests; batch with GraphQL or a dedicated endpoint.

## 8. Build-time enforcement

| Check | Tool |
|---|---|
| Bundle size growth > 5% per release | `danger-js` rule on the bundle visualizer output. |
| Cold start regression > 10% | Macrobenchmark in CI; fail PR on threshold. |
| Frame timing | Compose Compiler metrics for Android; Hermes profiler for RN. |

## 9. Field measurement

- iOS: `MetricKit` for power, hangs, scroll latency.
- Android: Firebase Performance + Macrobenchmark.
- Cross-platform: Sentry Performance, NewRelic Mobile.

Look at **p75** and **p90** in field data. The user is the 75th percentile, not the 50th.

## 10. Hawkeye's gate inputs

For each epic NFR review (`tea/nfr/{epic}.md`):

- Cold start (mid-range device).
- Bundle size delta vs last release.
- Steady-state memory.
- Critical-flow frame rate (one E2E run with FPS capture).
- Battery (instrumented test with consistent workload).

## 11. Hand-off

Fury sets the targets in `nfr-principles.md`. Tony picks the stack respecting the targets. Mantis designs without animation excess. Shuri implements. Hawkeye verifies on each release; regressions hit Concerns/Fail at the gate.
