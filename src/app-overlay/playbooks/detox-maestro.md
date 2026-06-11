---
playbook: detox-maestro
owner: wize-agent-test-architect   # Hawkeye
applies_when: app-overlay active
status: ready
---

# Mobile E2E — Detox + Maestro Playbook

Two tools, different angles. **Detox** integrates deep into RN/Expo with a real JS bridge and runs on real devices/simulators. **Maestro** is YAML-declarative, multi-platform (RN, Flutter, native), and exceptional for smoke + visual flows. Most teams want one of each, not both heavy.

## 1. Pick one (or both, lean)

| Need | Pick |
|---|---|
| RN / Expo only, deep state introspection, fastest iteration | **Detox** |
| Native, Flutter, RN — mixed shop | **Maestro** |
| Smoke flow you run on every PR | **Maestro** |
| Detailed assertions on bridge state, mocks at JS layer | **Detox** |
| Cross-platform visual regression | **Maestro** snapshots (Cloud) |
| Tight CI matrix (iOS sim + Android emulator + cloud devices) | **Maestro Cloud** or **MagicPod / BrowserStack** |

Default split (Hawkeye `tea-design.md`):

- **Vitest / Jest** for unit + component (≥ 70%).
- **Maestro** for smoke (3–8 critical flows on every PR).
- **Detox** for RN-specific deep flows (auth, deep links, push handling).

## 2. Maestro — getting started

```yaml
# .maestro/flows/sign-in.yml
appId: com.qwize.app
---
- launchApp
- assertVisible: "Sign in"
- tapOn:
    text: "Email"
- inputText: "qa@qwize.io"
- tapOn:
    text: "Password"
- inputText: "test1234"
- tapOn: "Sign in"
- assertVisible:
    id: "home-tab"
    timeout: 10000
```

Run locally:

```bash
maestro test .maestro/flows/sign-in.yml
maestro studio                         # record flows visually
maestro cloud .maestro/                # run on Maestro Cloud
```

Tips:

- One flow per file. Compose with `runFlow` for shared steps (sign-in fixture).
- Prefer `id`-based selectors over text — text changes with locale.
- Wrap network-dependent waits in `extendedWaitUntil` so they fail loud, not flaky.
- Snapshots: `takeScreenshot` then commit baseline; Maestro Cloud handles diffing.

## 3. Detox — getting started (RN / Expo)

```bash
npx detox init -L jest
```

```jsonc
// .detoxrc.js (sketch)
module.exports = {
  testRunner: 'jest',
  apps: {
    'ios.debug':     { type: 'ios.app', binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/App.app', build: 'xcodebuild ...' },
    'android.debug': { type: 'android.apk', binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk', build: 'cd android && ./gradlew assembleDebug assembleAndroidTest' }
  },
  devices: {
    'ios.sim':  { type: 'ios.simulator', device: { type: 'iPhone 15 Pro' } },
    'android.emu': { type: 'android.emulator', device: { avdName: 'Pixel_7_API_34' } }
  },
  configurations: {
    'ios.debug':     { device: 'ios.sim',  app: 'ios.debug' },
    'android.debug': { device: 'android.emu', app: 'android.debug' }
  }
};
```

```ts
// e2e/sign-in.test.ts
describe('Sign in', () => {
  beforeAll(async () => { await device.launchApp(); });
  beforeEach(async () => { await device.reloadReactNative(); });

  it('lets a known user in', async () => {
    await element(by.id('email')).typeText('qa@qwize.io');
    await element(by.id('password')).typeText('test1234');
    await element(by.id('signin-cta')).tap();
    await expect(element(by.id('home-tab'))).toBeVisible();
  });
});
```

Hawkeye rules for Detox:

- Always use `testID`. Never text selectors.
- Reset state between tests (`device.reloadReactNative()`); never share login state silently.
- Network: prefer **MSW-RN** or in-app mock layer. Don't hit prod.
- Set `Detox.setReachability` to simulate offline scenarios.

## 4. Cross-platform CI sketch

```yaml
# .github/workflows/mobile-e2e.yml (sketch)
jobs:
  maestro-ios:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - run: brew tap mobile-dev-inc/tap && brew install maestro
      - run: yarn install --frozen-lockfile
      - run: yarn build:ios
      - run: maestro test .maestro/flows/
  maestro-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          target: google_apis
          arch: x86_64
          profile: pixel_7
          script: |
            curl -Ls "https://get.maestro.mobile.dev" | bash
            maestro test .maestro/flows/
  detox-ios:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - run: yarn install --frozen-lockfile
      - run: brew tap wix/brew && brew install applesimutils
      - run: yarn detox build -c ios.debug && yarn detox test -c ios.debug --headless
```

## 5. Flakiness — non-negotiable rules

1. **No `sleep(N)`.** Use built-in waits (`waitFor`, `extendedWaitUntil`).
2. Tests must pass 50× in a row in CI before they're trusted.
3. Reset app state between tests; don't share login.
4. Don't depend on network for unit/component layer — mock at the boundary.
5. If a test is flaky once, fix or quarantine it the same day. Don't `retries: 5`.

## 6. Critical journeys to cover (always)

Even MVPs should ship E2E for:

- First-run onboarding through to the home tab.
- Sign-up + sign-in + sign-out.
- Primary "value moment" action (the one PRD success criterion exists for).
- Push notification deep link.
- Network-failure UX (offline mode, retry).

Everything else is nice-to-have until the team has signal that the critical flows are stable.

## 7. Device matrix

See `device-matrix.md`. Maestro Cloud and BrowserStack expose matrices Hawkeye can declare in YAML and run weekly.

## 8. Don'ts

- E2E tests in the same job as unit tests (slow, blocks faster signal).
- Selectors by visible text in a multilingual app.
- Running E2E only at release; broken paths get found at the worst time.
- "Manual smoke" replacing automated smoke. Maestro flows take a day to write and save weeks per year.

## 9. Hand-off

Tony picks RN / native / Flutter; that decides the Detox feasibility. Hawkeye writes the Maestro flow files alongside the story `tea-design.md`. Shuri owns the `testID`s and accessibility identifiers and treats them as a public API of the app — renaming one is a contract change.
