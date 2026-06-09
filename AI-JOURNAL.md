# AI Journal

Record of AI interactions — accepted, challenged, or overridden decisions.

---

## Phase 0 — Scaffold & Guardrails

**Accepted:** Angular 20 scaffold with `--ssr true --routing true --style scss --skip-git`. Angular Material added via `ng add`.

**Overrode:** AI default includes zone.js in polyfills and CDN Material Icons link in index.html.
- Removed zone.js from `polyfills` in angular.json (zoneless requirement).
- Removed CDN `<link>` for Material Icons; added `material-icons` npm package to styles array instead.

**Why:** Brief explicitly requires `provideZonelessChangeDetection()` and local icon serving — CDN links are a dependency risk and violate the offline-readiness requirement.

---

## Phase 1 — Mock Backend + 250 Records

**Accepted:** Custom Express server over `json-server`. Brief requires OR-search across three fields — `json-server` ANDs `_like` params and has no `/summary` endpoint. Express gives full control.

**Overrode:** Default `json-server` recommendation. Used a hand-written Express ESM server with `applyFilters()` that correctly ORs `policyNumber`, `policyHolderName`, and `underwriter` for free-text search.

**Challenged:** Initial `npm run start:api` test showed wrong summary counts (63/63/62/62) — stale process was still running on port 3000. Always kill the port before testing. Added `lsof -ti:3000 | xargs kill` to the test protocol.

**Why:** Server-side filtering is a non-negotiable from the brief. Client-side filter-then-paginate would fail the grading criterion.

---

## Phase 2 — Models, API Service, Signal Store

**Accepted:** String unions over TypeScript enums for PolicyStatus/LineOfBusiness/Region/Currency. Unions are lighter, tree-shakeable, and work natively with template literal types — enums add runtime overhead and an extra import in every file.

**Overrode:** AI default of `takeUntilDestroyed()` with no argument inside class methods. Calling it without a `DestroyRef` only works in constructor/field-initialiser context (injection context). Passed explicit `inject(DestroyRef)` to all method-level subscriptions.

**Overrode:** AI omitted `zone.js` from test polyfills entirely. Karma's runner requires zone.js even in a zoneless Angular app. Restored `zone.js/zone.js/testing` to test polyfills only, while keeping them out of the app build. Added `provideZonelessChangeDetection()` to every TestBed to ensure Angular uses zoneless CD inside tests.

**Challenged:** Signal store `loadPolicies()` initially re-fetched page + summary in sequence. Switched to `forkJoin({ page, summary })` so both requests fire in parallel — halves the perceived load time.

**Why:** `takeUntilDestroyed` without `DestroyRef` silently breaks in method scope; zoneless testing requires both zone.js (runner infra) and `provideZonelessChangeDetection()` (Angular CD).

---

## Phase 3 — Policy Table

**Accepted:** Presentational component pattern — `PolicyTableComponent` reads store signals and emits output events only; no HTTP dependency in the component.

**Overrode:** AI placed `[trackBy]` on the `*matRowDef` row element. `trackBy` must be set on `<table mat-table>` directly — the row def binding does not accept it. Moved to the table element.

**Overrode:** AI defaulted to `MatTableDataSource` for the paginator. Brief requires server-side pagination: `MatTableDataSource` paginates client-side and would silently break the requirement. Used a controlled paginator bound to `store.total()` / `store.pagination()` instead.

**Challenged:** Initial `formatPremium` specs used `1,250,000 SGD` → expected `'S$1.2M'`. Two issues: `getCurrencySymbol('SGD', 'narrow')` returns `'$'` in the test runner's locale (en-US), and `1.25.toFixed(1)` rounds to `'1.3'` in V8. Fixed tests to use unambiguous values (exact multiples, USD) to avoid locale + floating-point rounding edge cases.

**Why:** Controlled paginator is mandatory for server-side pagination; spec values must not rely on locale-specific currency symbol rendering.

---

## Phase 4 — Filters + Free-Text Search

**Overrode (again):** `takeUntilDestroyed()` called without `DestroyRef` in `ngOnInit()`. Same fix as Phase 2 — injected `DestroyRef` and passed it explicitly to both `valueChanges` subscriptions.

**Accepted:** Dual `valueChanges` subscription pattern — immediate for chips snapshot, debounced for API/storage/URL. Clean separation of UI responsiveness vs network efficiency.

**Accepted:** Seed priority URL → localStorage → defaults. URL wins so shared links restore the sender's exact filtered view.

**Challenged:** Initially used a single debounced subscription for both chips and the API. Chips lagged 400 ms — visibly jarring. Split into two subscriptions to give instant chip feedback without extra API calls.

**Why:** `takeUntilDestroyed` without `DestroyRef` throws `NG0203` at runtime in method scope. Two subscriptions with different timing characteristics are the correct tool for two different responsiveness requirements.

---

## Phase 5 — Summary Panel

**Accepted:** Server-computed summary only — never aggregate client-side. The server `/policies/summary` endpoint applies the same filters over all records; the client holds one page.

**Accepted:** SVG arc with `stroke-dashoffset` driven by a `computed()` signal. `prefers-reduced-motion` handled purely in CSS — no JS media-query check needed.

**Accepted:** Color + icon + text on every status card — never color alone. WCAG 1.4.1 compliance.

**Challenged:** Initial design had summary numbers computed from `store.policies()` (current page only). Corrected to `store.summary()` — a server aggregate. Page-level aggregation would show wrong totals when filters match more records than one page.

**Why:** KPI accuracy requires the full filtered dataset, not one page. SVG with CSS animation is the minimal, zero-dependency approach for a single-metric arc indicator.

---

## Phase 6 — Bulk Actions

**Accepted:** `BulkActionBarComponent` as a separate standalone component, not inlined in `PolicyOverviewPage`. Isolated snackbar + retry UX from the page shell; independently testable with a stub store.

**Overrode:** Store's `flagSelectedPolicies()` originally returned `void` and subscribed internally. Changed to return `Observable<Policy[]>` piped with `tap` (state mutations) and `catchError` (rollback + `throwError`). The caller subscribes and handles UI feedback. This cleanly separates state management (store) from user feedback (component).

**Challenged:** Initial spec used a pre-provided `MatSnackBar` spy. Standalone components host their own injector scope — the `MatSnackBarModule` from the component's `imports` shadowed the spy. Fixed by obtaining `MatSnackBar` via `fixture.debugElement.injector.get(MatSnackBar)` and calling `spyOn` on the actual instance.

**Overrode:** Store stub used `computed()` signals in tests. Replaced with plain getter functions — they satisfy the same call signature (`store.selectedCount()`) without requiring an Angular injection context in spec scope.

**Why:** Returning an Observable from `flagSelectedPolicies()` is the idiomatic RxJS pattern when the caller needs to react to completion. `void` forces coupling: either the store also shows UI, or the component needs a separate notification channel (a Subject, an effect) — both add complexity. One Observable, two concerns, clean interface.

---

## Phase 7 — Theming + Storage Abstraction

**Accepted:** CSS custom properties for design tokens (not Sass variables). Runtime-swappable; a single class toggle on `<html>` re-scopes every token without a rebuild or a JS loop over elements.

**Accepted:** `ThemeService.isDark` as a `signal<boolean>`. An Angular `effect()` mirrors the signal onto `html.dark-theme` — clean unidirectional data flow; no direct DOM imperative calls outside the effect.

**Accepted:** Init priority: stored value → `prefers-color-scheme` → light. Stored value wins so explicit user choices survive page loads; system preference applies only on first visit.

**Overrode:** `PolicyStore` had two raw `localStorage` calls (`storedPageSize()` and `setPage()`). Migrated both to `StorageService`. The rule "StorageService is the only caller of localStorage" is now enforced by grep — confirmed zero violations post-migration.

**Challenged:** `storedPageSize()` was a module-level standalone function that called `localStorage` directly. Inlining it as a field-initialiser IIFE (`(() => { ... })()`) using `this.storage` keeps the logic at the same point without a separate top-level function.

**Overrode:** Default `app.html` Angular scaffold (Angular logo + links). Replaced with a Material toolbar containing the product name and `ThemePickerComponent`. Updated `app.spec.ts` to assert on `.app-title` text instead of the removed `<h1>`.

**Why:** WCAG AA contrast targets (≥4.5:1) are met by choosing token values analytically at authoring time — not left to browser heuristics. Both light and dark palettes are documented with computed contrast ratios in styles.scss comments.

---

## Phase 8 — Loading / Empty / Error States + Container + A11y

**Accepted:** Skeleton screens over a spinner. Skeletons fill space with spatially accurate shapes — filter bar, 4 status cards, 8 table rows — so the user's eye lands in the right place before data loads. A spinner gives no spatial context.

**Accepted:** `@defer (on idle)` around the table section. Filter bar and summary panel paint on first tick; Angular defers instantiating `PolicyTableComponent` and its Material imports until the browser is idle — faster LCP without splitting routes.

**Accepted:** `role="alert"` on `ErrorStateComponent` (assertive, immediate announcement) vs `role="status"` + `aria-live="polite"` on loading and empty states (deferential, non-interrupting).

**Accepted:** Dialog on `rowClick` (not navigation). Keeps filter state, scroll position, and selection intact. `MatDialog` provides `role="dialog"`, `aria-modal`, focus trap, ESC-to-close, and `restoreFocus: true` out of the box.

**Overrode:** `PolicyOverviewPage` had its template inline. Extracted to `policy-overview.page.html` + `.scss` to accommodate the state-machine markup (loading / error / empty / data). Inline styles can't handle multi-branch `@if`/`@defer` readably.

**Overrode:** Global `:focus-visible` outline was absent — Material resets the browser default. Added `3px solid var(--ph-primary)` outline globally in `styles.scss`. This is a WCAG 2.4.7 (Focus Visible, Level AA) requirement.

**Why:** A skip link + `#main-content` target is mandatory (WCAG 2.4.1, Level A) for keyboard-only users who cannot skip the repeated toolbar on every page. Three years of browser support for `:focus-visible` makes it the right tool over `:focus` (which shows for mouse clicks too).

---

## Phase 9 — Test Coverage (CH-110)

**Accepted:** Istanbul branch coverage as the primary gap metric. Statements (92%), functions (92%), and lines (96%) were already strong. Branches sat at 73.68% — the only metric below the 80% target — because every truthy branch in the "optional filter param" conditionals was untested.

**Root cause analysis:** `buildFilterParams` in `PolicyApiService` had 7 `if` guards for `premiumMin`, `premiumMax`, four date-range fields, and `flaggedForReview`. All existing tests called `getAll` with `{ search, statuses, regions }` only — every truthy branch was dead to Istanbul.

**Accepted:** One new `getAll` test with all optional params populated covers all 7 truthy branches in one sweep instead of adding 7 individual tests.

**Accepted:** `policy-filter.component.spec.ts` needed two additions: (1) `mapToStoreFilter` called with all four date fields set covers `effectiveDateTo`, `expiryDateFrom`, `expiryDateTo` truthy branches; (2) a URL-seed test with `premiumMin` and all date URL params hits the `urlParamsToFilter` ternary and all `patchFormFromFilter` date-conversion branches simultaneously.

**Accepted:** `renewPolicy('unknown-id')` test in the store spec. The `if (!original) return;` early-exit was never reached because every existing test called with a known ID. A single call with a non-existent ID exercises the guard and asserts `api.patch` was not called — clean behavioral test.

**Accepted:** Stored page size test by providing a `StorageService` stub returning `50` (a valid `PAGE_SIZE_OPTIONS` value). This hits the `n && PAGE_SIZE_OPTIONS.includes(n) ? n : 25` truthy branch in the IIFE field initializer that normal tests skip (localStorage returns null by default in JSDOM).

**Accepted:** `allSelected()` false-branch test in `policy-table.component.spec.ts`. The `ids.length > 0 &&` short-circuit's false path (when the policy list is empty) was never reached because the store stub always had 2 policies. Setting `storeSpy.policies.set([])` covers it.

**Result:** 107/107 tests pass. Branch coverage: 73.68% → **86.46%** (+12.78pp). All four coverage metrics now exceed 80%: Statements 94.88%, Branches 86.46%, Functions 92.3%, Lines 96.8%.
