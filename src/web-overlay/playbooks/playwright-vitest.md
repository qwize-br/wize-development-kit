---
playbook: playwright-vitest
owner: wize-agent-test-architect   # Hawkeye
applies_when: web-overlay active
status: ready
---

# Web Test Stack — Hawkeye Playbook

Two tools, one rule per: **Vitest** for fast, isolated, deterministic. **Playwright** for end-to-end through real browsers.

## 1. What goes where

| Test type | Tool | Speed | What it proves |
|---|---|---|---|
| Pure function | Vitest | µs | A unit of logic does its job. |
| React/Vue component | Vitest + Testing Library | ms | A component renders and reacts correctly. |
| Hook / store / state | Vitest | ms | Side-effect-free transitions are correct. |
| Service / API call | Vitest + MSW | ms | Client glue handles 2xx/4xx/5xx. |
| Integration (multi-component) | Vitest + Testing Library | tens of ms | Real interactions on a fake DOM. |
| **User journey (E2E)** | Playwright | seconds | A real browser can complete the flow. |
| Visual regression | Playwright (toHaveScreenshot) | seconds | UI didn't shift unintentionally. |
| Cross-browser | Playwright (chromium/firefox/webkit) | minutes | Behavior is consistent. |

**Default split (Hawkeye `tea-design.md`):** 70/20/10 — unit/integration/E2E.

## 2. Vitest setup (per project)

```jsonc
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "vitest": "^2",
    "@vitest/coverage-v8": "^2",
    "@testing-library/dom": "^10",
    "@testing-library/user-event": "^14",
    "happy-dom": "^15",
    "msw": "^2"
  }
}
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'happy-dom',  // jsdom if you need broader DOM compat
    globals: true,
    setupFiles: ['./test/setup.ts'],
    coverage: { reporter: ['text', 'lcov'], thresholds: { lines: 80, branches: 75 } }
  }
});
```

### Test naming

`{feature}.spec.ts` for code. Stories sit beside them: `{Story}.story.tsx`. Avoid `__tests__` folders — co-locate.

### Patterns

- Use **Testing Library** queries by role first (`getByRole('button', { name: /save/i })`). Fall back to `getByLabelText`, then `getByText`, then `getByTestId` only as a last resort.
- Use **user-event v14**, never `fireEvent`, for interactions. It mimics real user input.
- For network: **MSW** at the network boundary. Don't mock `fetch` per-test.
- Snapshot tests are fine for small, stable shapes (a discriminated union, a normalized payload). Not for component trees.

## 3. Playwright setup

```jsonc
// package.json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:headed": "playwright test --headed"
  },
  "devDependencies": { "@playwright/test": "^1.50" }
}
```

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html']] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox',  use: devices['Desktop Firefox'] },
    { name: 'webkit',   use: devices['Desktop Safari'] },
    { name: 'mobile-ios', use: devices['iPhone 14'] },
    { name: 'mobile-android', use: devices['Pixel 7'] }
  ],
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev', port: 3000, reuseExistingServer: true
  }
});
```

### Page Object Model (light)

```ts
// e2e/pages/signin.page.ts
export class SignInPage {
  constructor(public page: Page) {}
  goto = () => this.page.goto('/signin');
  emailField = () => this.page.getByLabel(/email/i);
  passwordField = () => this.page.getByLabel(/password/i);
  submit = () => this.page.getByRole('button', { name: /sign in/i });
  async signIn(email: string, password: string) {
    await this.emailField().fill(email);
    await this.passwordField().fill(password);
    await this.submit().click();
  }
}
```

Keep POMs **thin**. They abstract selectors, not flows.

### Selectors — Hawkeye's rules

1. `getByRole` first.
2. `getByLabel` for forms.
3. `getByText` for content.
4. `data-testid` only when none of the above work (last resort).
5. **Never** CSS classes for selectors. Class names are styling concerns; they shift.

### Determinism

- Tests must pass 100× in a row locally. If they don't, they're flaky — fix the test or the code, never `retry: 5`.
- Use Playwright's auto-waiting (`expect(locator).toBeVisible()`). Never `setTimeout`.
- Mock time with `page.clock` when timing affects the test.

## 4. Visual regression (selective)

```ts
test('hero matches baseline', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hero')).toHaveScreenshot('hero.png', {
    maxDiffPixelRatio: 0.005
  });
});
```

Use for **stable, high-value** regions (logged-out marketing, primary nav, design-system showcase). Avoid on dynamic content (timestamps, user-generated text).

## 5. CI integration

```yaml
# .github/workflows/test.yml (sketch)
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run test:run -- --reporter=junit --outputFile=test-results/junit.xml
      - uses: actions/upload-artifact@v4
        with: { name: junit, path: test-results/ }
  e2e:
    runs-on: ubuntu-latest
    needs: unit
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build && npm run start &
      - run: npx wait-on http://localhost:3000
      - run: npm run e2e
      - if: failure()
        uses: actions/upload-artifact@v4
        with: { name: playwright-report, path: playwright-report/ }
```

## 6. Coverage targets (advisory)

- **Lines:** 80%+ unit/integration.
- **Branches:** 75%+ on logic modules.
- **E2E:** every critical user journey from the PRD. Not every page.

Coverage is a signal, not a goal. Hawkeye prefers one good E2E over five low-value unit tests.

## 7. Anti-patterns Hawkeye fails fast on

- `test.skip()` left in main.
- `if (!process.env.SLOW) test.skip()` — flaky shielded as flag.
- Snapshots of entire DOM trees.
- `wait(1000)` — non-deterministic by definition.
- Mocking the unit under test (then you're testing the mock).
- Selecting by class name.

## 8. Hand-off

For every story Tony slices, Hawkeye's `tea-design.md` declares: unit count / integration count / E2E count, fixtures needed, network mocks, environment. Shuri implements against that contract.
