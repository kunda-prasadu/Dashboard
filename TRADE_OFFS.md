# Trade-offs

Honest accounting of what we gave up for each architectural choice, what was deliberately deferred, and the known tech debt.

---

## Architectural Trade-offs

### Zoneless Angular + Karma Tests

**Gain:** Explicit, predictable change detection. No surprise re-renders from unrelated async operations.  
**Cost:** `zone.js` must stay in test polyfills (`angular.json`) so Karma's runner works. This triggers `NG0914` warnings in test output — cosmetic only. Every `TestBed` must include `provideZonelessChangeDetection()` manually; easy to forget.  
**Mitigation:** Warning is cosmetic; `provideZonelessChangeDetection()` added to every spec as a pattern.

---

### Custom Signal Store vs NgRx Signal Store

**Gain:** Zero extra dependencies, ~¼ the code, native Angular, no DevTools plugin required.  
**Cost:** No time-travel debugging, no Redux DevTools action log. Harder to audit state changes across a long session or reproduce a production bug.  
**Mitigation:** Acceptable at single-feature scope. If the app grows to 3+ slices with cross-feature state sharing, migrate to `@ngrx/signals`. The `PolicyStore` method signatures map directly to an NgRx signal store definition — migration is mechanical.

---

### Custom Express Server vs json-server

**Gain:** Correct OR-search, full control over filter logic, `/summary` aggregation, correct multi-value params.  
**Cost:** ~150 lines of boilerplate to maintain. Any schema change requires updating both `generate-data.js` and `server.js`.  
**Mitigation:** Both files are small and co-located under `mock-api/`. Changes are mechanical and grep-safe.

---

### Server-Side Pagination (No Adjacent-Page Cache)

**Gain:** Simple state (`_policies` holds one page), guaranteed data freshness on every navigation.  
**Cost:** Every page flip fires a new HTTP request. No instant page-flip like a pre-fetched sliding window cache would give.  
**Mitigation:** Requests hit a local mock server — latency is negligible in development. In production, a sliding window cache (prefetch ±1 page) can be added to `PolicyStore` without changing the API contract.

---

### String Unions vs Enums

**Gain:** Zero runtime overhead, tree-shakeable, no import needed in templates.  
**Cost:** No runtime reverse-lookup (`PolicyStatus[value]`). Typos in string literals are caught only at compile time.  
**Mitigation:** TypeScript strict mode catches all type mismatches at compile time. Constants arrays (`POLICY_STATUSES`) provide the runtime list when needed.

---

### `forkJoin` for Page + Summary (No Partial-Success)

**Gain:** Both requests fire in parallel — faster perceived load.  
**Cost:** If either request fails, `forkJoin` cancels both and emits the error. A partial success (page loaded but summary failed) is not representable.  
**Mitigation:** Both endpoints are served by the same Express process, so simultaneous failure is rare. The error interceptor normalises the error and the store sets a user-friendly message. Production upgrade path: `combineLatest` with per-stream error isolation.

---

### Material Icons Local Package (~200 kB CSS)

**Gain:** No CDN dependency, works offline and in air-gapped environments, no CORS risk.  
**Cost:** Full icon font added to styles bundle even if only ~20 icons are used.  
**Mitigation:** Acceptable for a dashboard application. Production upgrade: `fontmin` icon subsetting reduces the font to the used glyphs only.

---

### SVG Arc (No Chart Library)

**Gain:** Zero additional bundle weight; animatable via CSS; `prefers-reduced-motion` handled purely in CSS.  
**Cost:** Limited expressiveness — a full donut chart with labels, legends, and interactive tooltips would require significantly more SVG or a library.  
**Mitigation:** The expiry arc is a single-metric indicator (fraction of active policies expiring within 30 days). SVG is the right tool at this scope.

---

### Two `valueChanges` Subscriptions in `PolicyFilterComponent`

**Gain:** Instant chip feedback + debounced API calls — best of both UX and performance.  
**Cost:** Two subscriptions to manage and tear down instead of one.  
**Mitigation:** Both use `takeUntilDestroyed(destroyRef)` — teardown is automatic and identical.

---

### URL Filter Persistence (`replaceUrl: true`)

**Gain:** Filters are bookmarkable and shareable across teams.  
**Cost:** Every filter change (post-debounce, ~400 ms) triggers a router navigation. On very rapid filtering this causes brief address-bar flicker.  
**Mitigation:** `replaceUrl: true` means no history stack pollution — back-button always goes to the previous page, not a previous filter state. Debounce at 400 ms limits navigation rate.

---

### Controlled Paginator vs `MatTableDataSource`

**Gain:** True server-side pagination — each page change hits the API; `store.total()` drives the paginator length.  
**Cost:** More template wiring — three bindings (`[length]`, `[pageIndex]`, `[pageSize]`) plus a `(page)` handler vs. one `[dataSource]` assignment.  
**Mitigation:** The extra bindings are declarative, live entirely in the template, and make the pagination contract explicit for testing.

---

### Compact Premium Formatting (`formatPremium`)

**Gain:** Consistent, readable column — no wide numbers breaking the table layout.  
**Cost:** Precision loss — `S$1.25M` rounds to `S$1.3M`. An underwriter needing the exact figure must open the detail view.  
**Mitigation:** The detail dialog shows the full unformatted amount. The table is a scanning tool, not an audit tool.

---

### Optimistic Updates without Confirmation Dialog

**Gain:** Instant UI feedback — flagging and renewing a policy feel immediate.  
**Cost:** On network error, the UI briefly shows the optimistic state before rollback. Users may find the flash jarring.  
**Mitigation:** Rollback is synchronous (signal update) so the flash is sub-frame. A snackbar with Retry tells the user what happened. `_lastFailedFlagIds` is exposed for UI highlighting.

---

### `Observable` Return from `flagSelectedPolicies()` (Caller Must Subscribe)

**Gain:** Clean separation — store owns state, component owns UI feedback. No second notification channel.  
**Cost:** Forgetting to subscribe means nothing happens — a silent bug.  
**Mitigation:** Both `BulkActionBarComponent` subscriptions use `takeUntilDestroyed(this.destroyRef)`. An RxJS lint rule (`no-subscribe-without-destroy`) would catch missing teardown.

---

### `effect()` for DOM Class Mutation (vs. Imperative `classList.toggle`)

**Gain:** Declarative, reactive — `isDark` signal drives the DOM automatically; `setDark()` stays pure.  
**Cost:** Effects run after the current microtask. A test that asserts the DOM class immediately after `setDark()` without `fixture.detectChanges()` may fail.  
**Mitigation:** Tests assert on signal values and `StorageService.set` calls — not on the DOM class directly. The class toggle is validated manually or by E2E tests.

---

### CSS Custom Properties for Theming (vs. Sass Variables)

**Gain:** Runtime theme switch without a rebuild; one `<html>` class toggle re-scopes every token.  
**Cost:** Token name typos fall back to browser defaults silently — no compile-time error for CSS variable names.  
**Mitigation:** Strict `--ph-` prefix naming convention. Visual regression tests (e.g. Storybook snapshots or Playwright screenshots) would catch unexpected fallbacks.

---

### Branch Coverage at 86% (Not 100%)

**Gain:** Tests are behaviorally meaningful — they exercise specific data flows, not just every branch for coverage's sake.  
**Cost:** Some branches remain uncovered. A false sense of completeness if the team treats "86% branches" as "all critical paths tested."  
**Mitigation:** Coverage is a proxy metric. The suite asserts specific contracts (flag success/failure/retry, URL-seed priority, optimistic rollback). Remaining uncovered branches are Angular framework internals or unreachable defensive guards.

---

## What Was Deliberately Deferred

These capabilities were scoped out to deliver a production-quality MVP in the 10-phase roadmap. They are the natural next layer of work.

### End-to-End Tests (E2E)

**Why deferred:** E2E tests (Playwright or Cypress) require a running API, browser automation, and CI infrastructure. Adding them in Phase 10 would have doubled the setup effort without changing the deliverable.  
**Impact:** Golden-path user flows (load → filter → flag → retry) are not machine-verified across the full stack.  
**Upgrade path:** Add `playwright` + `ng e2e`; seed a known dataset in `beforeAll`; write 5–10 critical-path specs.

### Micro-frontend / Module Federation (MFE)

**Why deferred:** MFE infrastructure requires a shell app, module federation config, and shared dependency versioning across hosts and remotes. Out of scope for a single-feature dashboard.  
**Impact:** The `policy-dashboard` feature is not independently deployable as a remote module.  
**Upgrade path:** The `policy-dashboard/` feature folder is already self-contained — it has no cross-feature dependencies. Wrapping it as an MFE remote is an infra task, not a code rewrite.

### Virtual Scrolling for Large Datasets

**Why deferred:** Server-side pagination limits the browser to 25 records at a time, making virtual scrolling unnecessary at current scale.  
**Impact:** If `pageSize` is increased to 200+ records, the table DOM will grow and performance may degrade.  
**Upgrade path:** Replace `<mat-table>` with Angular CDK `<cdk-virtual-scroll-viewport>` + `ScrollingModule`. Requires changing the data source binding.

### Full Internationalisation (i18n)

**Why deferred:** APAC dashboard serves English-speaking operations teams in the target scope. Full i18n requires locale files, ICU message syntax for pluralisation, and right-to-left layout support.  
**Impact:** UI strings are hardcoded English. `premiumAmount` uses `getCurrencySymbol('SGD', 'narrow')` which is locale-aware but the surrounding text is not.  
**Upgrade path:** Extract all UI strings to Angular i18n `$localize` tags; add locale-specific number and date pipes; run `ng extract-i18n`.

### Foreign Exchange (FX) Conversion Display

**Why deferred:** Requires a live or cached FX rate feed, a rate-selection UI, and currency conversion logic in the store or a pipe.  
**Impact:** `premiumAmount` values are shown in their native currency. There is no single-currency consolidated GWP view.  
**Upgrade path:** Add an `FxService` that fetches rates from a public API; add a currency-selector to the toolbar; apply FX in `formatPremium()` and in the summary panel.

### Granular Role-Based Access Control (RBAC)

**Why deferred:** The mock API has no authentication layer. RBAC requires a token-based auth flow, role claims, and route guards.  
**Impact:** The "Flag for Review" action is available to all users. In production, only senior underwriters should have this permission.  
**Upgrade path:** Add a `AuthService` returning `signal<UserRole>`; gate `BulkActionBarComponent` visibility with a `canFlag()` computed signal; add an `authGuard` to the `/policies` route.

### Policy Renewal Workflow (UI)

**Why deferred:** `PolicyStore.renewPolicy()` is implemented (optimistic status + new dates + API PATCH), but the trigger UI — a "Renew" button in the detail dialog — was not wired up within the Phase 8 scope.  
**Impact:** The renewal logic exists in the store and is unit-tested but is not accessible from the UI.  
**Upgrade path:** Add a "Renew Policy" button to `PolicyDetailDialogComponent`; call `store.renewPolicy(policy.id)`; show a confirmation snackbar on success.

### SSR Data Pre-fetching (Angular `TransferState`)

**Why deferred:** The app has SSR enabled but `loadPolicies()` fires client-side in `ngOnInit`. On first render, the SSR shell is empty; the client re-fetches after hydration.  
**Impact:** The SSR build does not benefit from pre-rendered policy data. The `serve:ssr:policy-dashboard` script works, but the first contentful paint is a skeleton screen.  
**Upgrade path:** Use Angular's `TransferState` + `isPlatformServer` guard to pre-fetch in `ngOnInit` on the server side and transfer the JSON payload to the browser, eliminating the hydration re-fetch.

---

## Tech Debt Register

| ID | Debt | Location | Priority |
|---|---|---|---|
| TD-001 | `db.json` is gitignored — new contributors must run `generate:mock` manually | `mock-api/generate-data.js` | Low |
| TD-002 | PATCH updates are in-memory only; API restart resets all flag/renew changes | `mock-api/server.js` | Low (mock-only) |
| TD-003 | `PolicyDetailDialogComponent` Renew button not wired to `store.renewPolicy()` | `policy-detail-dialog.component.ts` | Medium |
| TD-004 | No E2E test coverage for the flag → snackbar → retry golden path | (absent) | High |
| TD-005 | SSR `loadPolicies()` fires client-side only — no `TransferState` pre-fetch | `policy-overview.page.ts` | Medium |
| TD-006 | No authentication / RBAC — "Flag for Review" accessible to all users | `bulk-action-bar.component.ts` | High (production) |
| TD-007 | Material Icons full font (~200 kB) — no icon subsetting | `angular.json` styles | Low |
| TD-008 | No FX conversion — GWP shown in native currency per record | `summary-panel.component.ts` | Medium |
| TD-009 | `pageSize` stored in localStorage — `PAGE_SIZE_OPTIONS` validation on every store init | `policy.store.ts` | Low |
