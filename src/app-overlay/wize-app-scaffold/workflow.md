---
code: wize-app-scaffold
name: App Scaffold
overlay: app
owner: wize-agent-architect   # Tony
status: stub
---

# App Scaffold

**Goal.** Scaffold an empty-but-runnable mobile app per chosen runtime.

## Supported runtimes (catalog)
- React Native + Expo
- React Native bare
- Flutter
- SwiftUI (iOS native)
- Jetpack Compose (Android native)
- Capacitor / Ionic (hybrid)

## Steps
1. Runtime interview (Tony asks; Fury approves).
2. Run the runtime's create command (e.g., `npx create-expo-app`).
3. Wire up design tokens from `.wize/solutioning/design-system/tokens.json`.
4. Configure linter, formatter, test runner (Detox / Maestro placeholder).
5. Generate baseline navigation from `.wize/planning/ux/ux-design/`.
6. Commit "initial scaffold (story E00-S01)".
