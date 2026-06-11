---
catalog: app-stack
owner: wize-agent-architect   # Tony (with Fury on strategy)
applies_when: app-overlay active
status: ready
---

# App Stack Catalog — Tony's Reference

The mobile stack decision is harder to reverse than the web one. Pick deliberately. This catalog lists each option with the **trade-off honest enough that you don't relitigate it in six months**.

## 1. Decision dimensions

Order them: **distribution → team → performance → reuse**.

1. **Distribution** — App Store + Play Store only? B2B enterprise (TestFlight/internal)? Sideload?
2. **Team** — primary skill set: web, native (Swift/Kotlin), Flutter (Dart)?
3. **Performance** — animation-heavy / camera / AR / ML on-device? Or list + form?
4. **Code reuse** — does a web app share business logic? How much?
5. **Hiring tail** — what skill set will be easy to hire from in 2 years?

## 2. Frameworks

### React Native + Expo (managed workflow)

| | |
|---|---|
| **Pick when** | Team is JS/TS-strong; cross-platform with one codebase + fast iteration. |
| **Strengths** | EAS Build/Update/Submit; OTA updates; same team can ship the web product. |
| **Costs** | Native modules sometimes need ejecting; SDK lag for very-new OS features. |
| **Perf ceiling** | 60 fps for typical UIs; deep native work requires bridging or custom modules. |
| **Best for** | Most cross-platform B2C apps with shared web team. |

### React Native (bare / community CLI)

| | |
|---|---|
| **Pick when** | Need native modules Expo doesn't ship + full control over Xcode/Gradle. |
| **Strengths** | Maximum flexibility, integrate any SDK. |
| **Costs** | Maintain native build configs; lose EAS conveniences (unless self-hosted). |
| **Best for** | Apps with heavy custom native (BLE, advanced camera, ML, payments SDKs). |

### Flutter

| | |
|---|---|
| **Pick when** | Pixel-perfect cross-platform UI with custom motion; team is Dart-OK. |
| **Strengths** | Skia rendering = identical UI across platforms; great motion; mature widgets. |
| **Costs** | Dart hiring pool smaller; web/desktop story uneven; non-trivial native interop. |
| **Perf ceiling** | High — Skia bypasses platform UI thread for many cases. |
| **Best for** | Animation-heavy or brand-precise apps; shop already on Flutter. |

### SwiftUI (native iOS)

| | |
|---|---|
| **Pick when** | iOS-only or iOS-primary; want platform-best UX and access to newest APIs day-one. |
| **Strengths** | Best feel, best APIs (Live Activities, WidgetKit, Vision, etc.). |
| **Costs** | Min iOS support shifts upward; doesn't help Android at all. |
| **Best for** | Premium iOS-led products; products with deep Apple-ecosystem integrations. |

### Jetpack Compose (native Android)

| | |
|---|---|
| **Pick when** | Android-only or Android-primary; want first-party Material 3 + platform integrations. |
| **Strengths** | Declarative + modern; Compose Multiplatform offers iOS path now. |
| **Costs** | Doesn't help iOS unless you commit to CMP. |
| **Best for** | Android-led products. |

### Compose Multiplatform (KMP + Compose)

| | |
|---|---|
| **Pick when** | Kotlin team, want shared business logic + shared UI. |
| **Strengths** | Code reuse high; same Kotlin stack on backend possible. |
| **Costs** | Newer; iOS UI parity caveats; ecosystem younger than RN/Flutter. |
| **Best for** | Kotlin-fluent teams comfortable with bleeding edge. |

### Capacitor / Ionic (hybrid)

| | |
|---|---|
| **Pick when** | Mostly-web app needs a thin native wrapper for store distribution. |
| **Strengths** | Reuse the existing web codebase 1:1; fastest path to store. |
| **Costs** | Performance ceiling lower than RN/Flutter; UI feel rarely passes "native". |
| **Best for** | Internal tools, content apps, MVPs where store presence > performance. |

### Native + KMP shared logic

| | |
|---|---|
| **Pick when** | Want native UIs (SwiftUI + Compose) + shared business logic in Kotlin. |
| **Strengths** | Best-of-both: native UX + shared domain. |
| **Costs** | Two UIs to maintain; KMP infra to manage. |
| **Best for** | Mature teams with enough size to maintain both fronts. |

## 3. Build & release

| Choice | Pick when |
|---|---|
| **Expo EAS** (Build, Submit, Update) | RN+Expo project, want a turn-key pipeline. |
| **Fastlane** | Native or RN bare, want scriptable lanes; established tool. |
| **Bitrise** | Cloud CI specialized for mobile, integrates with EAS/Fastlane. |
| **GitHub Actions + matrices** | Already on GitHub, custom needs, fewer mobile-specific shortcuts. |
| **App Center (sunset path)** | Legacy; migrate off. |

## 4. Auth

| Choice | Pick when |
|---|---|
| **Firebase Auth** | RN/Flutter; want SDK on every platform, simple onboarding. |
| **Auth0 / Clerk / WorkOS** | Enterprise SSO needs. |
| **Sign in with Apple / Google / Microsoft** | Required (Apple) when other social auth is offered; minimal friction. |
| **Custom OAuth via Supabase / your backend** | Want full control; team has experience. |

## 5. Data / sync

| Choice | Pick when |
|---|---|
| **WatermelonDB** (RN) | Offline-first apps with large local datasets. |
| **Realm / Atlas Sync** | Need bi-di sync to MongoDB. |
| **PowerSync / Replicache / Triplit** | Modern offline + sync over Postgres / custom. |
| **TanStack Query + AsyncStorage / EncryptedStorage** | Most apps — fetch + cache. |
| **GraphQL + Apollo** | Single API for many clients (web + mobile share schema). |

## 6. State management

| Choice | Pick when |
|---|---|
| **Zustand / Jotai** | Small global state; RN |
| **TanStack Query** | Server-derived data dominates. |
| **MobX-State-Tree** | Bigger app, opinionated structure. |
| **Recoil** | (Niche; less active recently — verify.) |
| **Provider / Riverpod** | Flutter. |

## 7. Storage

- **AsyncStorage** (RN) — small KV only; not for sensitive data.
- **EncryptedStorage** / **react-native-keychain** — tokens, secrets.
- **MMKV** — fast KV; sub-ms reads; replaces AsyncStorage for perf-critical paths.
- **SQLite (Op-SQLite / better-sqlite)** — relational on device.
- **Realm** — object DB with sync.

## 8. Push notifications

| Choice | Pick when |
|---|---|
| **Expo Push** | RN/Expo; simplest path. |
| **OneSignal** | Cross-platform, segmentation features. |
| **Firebase Cloud Messaging (FCM) + APNs** | Custom backend; full control. |
| **Customer.io / Iterable** | Marketing-driven (campaigns, journeys). |

## 9. Analytics + observability

| Choice | Pick when |
|---|---|
| **Amplitude / Mixpanel / PostHog** | Product analytics. |
| **Sentry / Bugsnag** | Crash + performance. |
| **Firebase Performance / Crashlytics** | Free, broad coverage. |
| **DataDog Mobile RUM** | Already on DataDog. |

## 10. Anti-patterns Tony flags fast

- **React Native for an animation-heavy / camera-heavy app** without scoping native modules upfront.
- **Flutter for an iOS-primary product** when the team has no Dart history.
- **Capacitor for a product needing 60 fps gestures** — pick RN/native.
- **One framework for two products** that don't share the audience or team.
- **Side-loading internal apps with no signing strategy.**

## 11. Recording the choice

Tony documents the chosen stack into:

- `.wize/planning/tech-vision.md` (Fury): platforms covered, non-negotiables.
- `.wize/solutioning/architecture.md` (Tony): runtime, build, release pipeline, native modules required.
- `.wize/solutioning/adrs/ADR-002-mobile-stack.md`: trade-off log.
- `.wize/planning/app/device-matrix.md`: targets that justified the perf choice.
