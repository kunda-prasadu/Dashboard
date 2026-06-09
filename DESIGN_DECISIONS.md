# Design Decisions

Each entry records **what** was chosen, **why**, what was **rejected**, and where the decision is exercised in code.  
Entries are numbered `DD-###` for traceability in commit messages and PR descriptions.

---

## DD-001 · Zoneless Angular (`provideZonelessChangeDetection`)

**Chosen:** Remove zone.js from app polyfills. Register `provideZonelessChangeDetection()` in `app.config.ts`.  
**Rejected:** Default zone.js-based change detection.

**Why:**
- Explicit, deterministic rendering — Angular only re-renders when a signal it reads has changed. No surprise re-renders from unrelated `setTimeout`, `fetch`, or third-party library callbacks.
- Performance: zone.js patches every async API in the browser; removing it reduces initial parse cost and eliminates the async interception overhead on every event.
- Angular's stated long-term direction — zone.js support will eventually be deprecated for new apps.

**Caveat:** zone.js is still in test polyfills (`angular.json` → `"test"` target `"polyfills"`). Karma's runner requires zone.js to schedule async callbacks. Angular change detection inside tests is still zoneless via `provideZonelessChangeDetection()` in each `TestBed`. This causes `NG0914` warnings in test output — cosmetic only, not a functional issue.

**Files:** `app.config.ts`, `angular.json` (app polyfills vs test polyfills)

---

## DD-002 · Signal Store over NgRx

**Chosen:** Custom `PolicyStore` using `signal<T>()`, `computed()`, `effect()`, `toSignal()`.  
**Rejected:** NgRx (actions / reducers / selectors / effects). Also rejected: NgRx Signal Store (still adds `@ngrx/signals` dependency).

**Why:**
- Single-feature scope — one store, one slice. NgRx overhead (~4× the code: actions, reducer, selectors, effects, action groups) is pure ceremony at this scale.
- Signals are Angular-native since v17. Zero extra dependencies; no DevTools plugin required; `computed()` replaces selectors without boilerplate.
- Optimistic updates are natural: capture snapshot → mutate signal → call HTTP → rollback on error. NgRx would need `optimisticUpdate` from `@ngrx/effects` plus paired action types (e.g. `FlagSuccess` / `FlagFailure`).
- Testability: the store is a plain injectable class; spy on `PolicyApiService` and assert signal values directly — no action dispatching, no reducer testing.

**Upgrade path:** If the app grows to 3+ feature slices with cross-feature state sharing, migrate to NgRx Signal Store. The `PolicyStore` interface (signals + methods) maps directly to an `@ngrx/signals` store definition.

**Files:** `policy.store.ts`, `policy.store.spec.ts`

---

## DD-003 · String Unions over TypeScript Enums

**Chosen:** `type PolicyStatus = 'Active' | 'Expired' | 'Pending' | 'Cancelled'`  
**Rejected:** `enum PolicyStatus { Active = 'Active', ... }`

**Why:**
- Zero runtime overhead — enums compile to JS objects (`{ Active: 'Active', ... }`); string unions are erased entirely.
- Tree-shakeable — unused union members are eliminated by the bundler; enum objects always survive.
- Native template compatibility — string literals work in `@switch` / `@if` without importing the enum; Angular templates can't import TypeScript enums directly.
- Exhaustiveness checking via `switch` + `default: const _: never = status` works identically.
- Constants arrays (`POLICY_STATUSES`, `REGIONS`, etc.) provide the runtime list when needed (e.g. filter dropdowns).

**Files:** `policy.model.ts`, `policy.constants.ts`

---

## DD-004 · Server-Side Filtering, Sorting, and Pagination

**Chosen:** All filter / sort / paginate logic resides in the Express mock server. The browser holds exactly one page of data.  
**Rejected:** Load all 250 records, filter/sort/paginate client-side over a local array.

**Why:**
- Explicitly required by the brief. Client-side approaches break at production scale (tens of thousands of policies), inflate the initial payload, and violate the stated requirement.
- The `_policies` signal holds one page (`data` array, max 25 items). `_total` holds the full count — the paginator uses it without needing all records in memory.
- Server-computed summary (`/policies/summary`) aggregates over the full filtered set; client aggregation would give wrong KPI totals for any multi-page result set.

**Files:** `mock-api/server.js`, `policy-api.service.ts`, `policy.store.ts`

---

## DD-005 · Custom Express Server over json-server

**Chosen:** Hand-written Express ESM server (`mock-api/server.js`).  
**Rejected:** `json-server` with `_like` query params.

**Why:**
- `json-server` ANDs multiple `_like` params — it cannot OR-search across `policyNumber`, `policyHolderName`, and `underwriter` in a single request. A correct free-text search is a non-negotiable from the brief.
- `json-server` has no aggregation/summary endpoint. The `/policies/summary` route requires filter-then-aggregate logic over the full dataset.
- The Express server is ~150 lines of straightforward, idiomatic JS. The tradeoff is worth it for correctness.

**Files:** `mock-api/server.js`, `mock-api/generate-data.js`

---

## DD-006 · Functional HTTP Interceptor

**Chosen:** `errorInterceptor: HttpInterceptorFn` registered via `withInterceptors([errorInterceptor])`.  
**Rejected:** Class-based `HttpInterceptor` implementing the legacy interface.

**Why:**
- Functional interceptors are Angular 15+ idiomatic. Stateless (no class, no `inject()` in constructor), composable, and directly testable with `HttpTestingController` without instantiating a class.
- Aligns with the standalone / zoneless architecture — no NgModule, no `providers: []` array in a module.
- Maps all `HttpErrorResponse` variants to `NormalisedHttpError { status, message, originalError }` so components never handle raw HTTP errors.

**Files:** `error.interceptor.ts`, `error.interceptor.spec.ts`, `app.config.ts`

---

## DD-007 · Angular Material 3 with Local Icons

**Chosen:** `@angular/material@20` + `material-icons` npm package in `angular.json` styles.  
**Rejected:** CDN `<link>` for Material Icons (what `ng add @angular/material` installs by default).

**Why:**
- CDN dependency is a reliability and security risk — CORS errors, cache poisoning, network outages affect the entire icon set.
- Local package works offline, in air-gapped corporate environments, and through strict CSP headers.
- The `material-icons` npm package adds ~200 kB to styles — acceptable for a dashboard application.

**Upgrade path:** Icon subsetting via `fontmin` or a custom icon registry eliminates unused glyphs in a production build.

**Files:** `angular.json` (styles array)

---

## DD-008 · `takeUntilDestroyed(destroyRef)` in Method Scope

**Chosen:** Inject `DestroyRef` via `inject(DestroyRef)` in the constructor / field initialiser and pass it explicitly to every `takeUntilDestroyed(this.destroyRef)` call.  
**Rejected:** `takeUntilDestroyed()` with no argument (Angular's "auto-detect injection context" mode).

**Why:**
- `takeUntilDestroyed()` without arguments only works inside an injection context (constructor or field initialiser). Calling it inside a method body at runtime throws `NG0203: inject() must be called from an injection context`.
- Subscriptions in `ngOnInit`, `flagForReview()`, `showFailure()`, and `loadPolicies()` all execute outside the injection context. Passing the pre-injected `DestroyRef` is the only correct approach.

**Files:** `policy.store.ts`, `bulk-action-bar.component.ts`, `policy-filter.component.ts`

---

## DD-009 · `forkJoin` for Parallel Page + Summary Fetch

**Chosen:** `forkJoin({ page: this.api.getAll(...), summary: this.api.getSummary(...) })` in `loadPolicies()`.  
**Rejected:** Sequential `getAll().pipe(switchMap(() => getSummary()))`.

**Why:**
- Page data and summary data are independent — there is no reason to wait for one before firing the other.
- `forkJoin` halves the perceived load time on every navigation and every filter/sort/page change.
- On failure, `forkJoin` cancels both and emits a single error. This is acceptable because both endpoints are served by the same process; simultaneous failure is rare. The error interceptor normalises the message.

**Files:** `policy.store.ts`

---

## DD-010 · Presentational Component Pattern for `PolicyTableComponent`

**Chosen:** Component reads `PolicyStore` signals; emits `output()` events. No `HttpClient` injection.  
**Rejected:** Smart component that calls `PolicyApiService` directly.

**Why:**
- Testable without `HttpTestingController` or a real store — a minimal stub that satisfies the signal interface is enough.
- Route-agnostic: the same table can be placed in a dialog, a different page, or a widget without dragging its own data-fetching logic.
- Enforces single-responsibility: the store owns data, the component owns rendering.

**Files:** `policy-table.component.ts`, `policy-table.component.spec.ts`

---

## DD-011 · Controlled `MatPaginator` (No `MatTableDataSource`)

**Chosen:** Bind `[length]`, `[pageIndex]`, `[pageSize]` directly to store signals; delegate `(page)` events to `store.setPage()`.  
**Rejected:** `MatTableDataSource.paginator = this.paginator` (Angular Material default).

**Why:**
- `MatTableDataSource` paginates client-side. It assumes all records are in memory and slices them locally. Our store holds one server page — attaching `MatTableDataSource` would silently paginate within 25 records instead of fetching the next server page.
- The controlled approach makes the pagination contract explicit and testable: assert that `store.setPage()` was called with the right args on `(page)` events.

**Files:** `policy-table.component.ts`

---

## DD-012 · `trackBy` on `<table mat-table>`, Not `*matRowDef`

**Chosen:** `[trackBy]="trackById"` on the `<table mat-table>` element.  
**Rejected:** `[trackBy]` on the `<tr *matRowDef>` element.

**Why:**
- Angular Material's `CdkTable` reads `trackBy` from the table host element, not from the row definition directive. Placing it on the row def silently does nothing and causes a strict-template compile error.

**Files:** `policy-table.component.html`

---

## DD-013 · Lazy-Loaded Page Shell via `loadComponent`

**Chosen:** `/policies` route uses `loadComponent(() => import(...))` to lazy-load `PolicyOverviewPage`.  
**Rejected:** Eagerly importing `PolicyOverviewPage` in `app.routes.ts`.

**Why:**
- The policy feature imports Angular Material table, sort, paginator, checkbox, datepicker, snackbar, dialog, icons — adding ~250 kB to the bundle. Lazy-loading keeps the shell tiny.
- The browser only pays the chunk-load cost when the user navigates to `/policies`, not on initial app load.

**Files:** `app.routes.ts`

---

## DD-014 · Compact Premium Formatting (`formatPremium`)

**Chosen:** `S$1.2M`, `S$450K`, `S$1,200` — compact locale-aware display.  
**Rejected:** Full number formatting (`S$1,250,000`).

**Why:**
- Premium values range from 1,000 to 5,000,000. Full numbers in a narrow table column create visual noise and force the column too wide.
- Compact notation gives enough precision for portfolio scanning; the detail dialog shows the full value for accuracy.

**Files:** `policy-table.component.ts`

---

## DD-015 · Two `valueChanges` Subscriptions in `PolicyFilterComponent`

**Chosen:** Immediate subscription for active-filter chips snapshot + `debounceTime(400)` + `distinctUntilChanged` subscription for API/storage/URL.  
**Rejected:** A single debounced subscription driving both chip state and API calls.

**Why:**
- If chips were debounced, they would lag 400 ms behind the user's selection — visibly jarring.
- Splitting gives instant chip feedback without extra API chatter. Both subscriptions share the same `destroyRef` for clean teardown.

**Files:** `policy-filter.component.ts`

---

## DD-016 · URL Query Param Sync for Filters

**Chosen:** `router.navigate([], { queryParamsHandling: 'merge', replaceUrl: true })` after every debounced filter change.  
**Rejected:** Filters stored only in localStorage (not reflected in URL).

**Why:**
- URL-persisted filters make views bookmarkable and shareable — an underwriter can send a filtered URL to a colleague.
- `replaceUrl: true` prevents the browser history from filling with intermediate filter states; back-button always goes to the previous page.

**Files:** `policy-filter.component.ts`

---

## DD-017 · Seed Priority: URL → localStorage → defaults

**Chosen:** On component init: URL query params win, then localStorage, then empty defaults.  
**Rejected:** Always seed from localStorage regardless of URL.

**Why:**
- A shared link must override the recipient's local preferences to show the sender's exact filtered view.
- localStorage is a personal preference cache — it applies only when no explicit URL context exists.

**Files:** `policy-filter.component.ts` (`mergeSeeds()`)

---

## DD-018 · `StorageService` as Sole `localStorage` Gateway

**Chosen:** All `localStorage` reads and writes go through `StorageService`. Enforced by grep.  
**Rejected:** Direct `localStorage.*` calls scattered across components and services.

**Why:**
- `localStorage` throws in SSR (no `window` on server) and in private-browsing quota-exceeded conditions. A centralised service handles both cases once with a try/catch + `isPlatformBrowser` guard.
- The grep rule `grep -r "localStorage" src/ --include="*.ts" | grep -v storage.service` verifies the contract at any time.

**Files:** `storage.service.ts`, `theme.service.ts`, `policy-filter.component.ts`, `policy.store.ts`

---

## DD-019 · Server-Computed Summary (Never Client Aggregation)

**Chosen:** `SummaryPanelComponent` reads `store.summary()` — returned by `GET /policies/summary`, which applies the same filters over all 250 records.  
**Rejected:** Aggregating over `store.policies()` (the current 25-record page).

**Why:**
- A page holds at most 25 records. Summing `premiumAmount` over 25 records when 200 match the filter would give wildly wrong GWP totals.
- The server has the full filtered dataset; the client has one page. KPI accuracy requires the server.

**Files:** `policy.store.ts` (`loadPolicies()`), `summary-panel.component.ts`

---

## DD-020 · SVG Arc for Expiry Indicator

**Chosen:** SVG `<circle>` with `stroke-dashoffset` driven by a `computed()` signal.  
**Rejected:** CSS `conic-gradient` or a canvas-based chart library.

**Why:**
- `stroke-dashoffset` is directly animatable via CSS `transition` — no JS animation loop.
- `prefers-reduced-motion` disables the transition at the CSS level; no JS media-query check needed.
- Pure SVG — zero additional bundle weight; works on any background; scales cleanly with `viewBox`.

**Files:** `summary-panel.component.ts`, `summary-panel.component.html`, `summary-panel.component.scss`

---

## DD-021 · Color Is Never the Sole Status Signal

**Chosen:** Each status card has a background color AND a `mat-icon` shape AND a text label.  
**Rejected:** Color-only differentiation (e.g. green card = Active, red card = Expired).

**Why:**
- WCAG 1.4.1 (Use of Color, Level A) requires that color is not the only means of conveying information.
- Users with color-blindness distinguish cards by icon shape alone; screen readers read the `aria-label` with the embedded count.

**Files:** `summary-panel.component.html`, `policy-detail-dialog.component.html`

---

## DD-022 · `flagSelectedPolicies()` Returns `Observable<Policy[]>`

**Chosen:** Store method returns `Observable<Policy[]>` via `tap` (state mutations) + `catchError` (rollback + `throwError`). Caller subscribes and handles UI feedback.  
**Rejected:** Store subscribes internally (`void` return) and uses a separate `Subject` or `effect` to notify the UI.

**Why:**
- One Observable carries both the data and the error signal — no second notification channel.
- State mutations (optimistic update, rollback, `_lastFailedFlagIds`) stay in the store.
- UI concerns (snackbar message, plural text, retry wiring) stay in the component.
- Standard RxJS — no Angular-specific indirection required.

**Files:** `policy.store.ts`, `bulk-action-bar.component.ts`

---

## DD-023 · Snackbar Spy via `fixture.debugElement.injector.get()`

**Chosen:** In tests, obtain `MatSnackBar` via `fixture.debugElement.injector.get(MatSnackBar)` and call `spyOn` on the live instance.  
**Rejected:** `{ provide: MatSnackBar, useValue: jasmine.createSpyObj(...) }` at `TestBed` level.

**Why:**
- Standalone components import `MatSnackBarModule` directly into their own injector scope. A spy provided at the root TestBed level is shadowed by the component-scoped module provider.
- Getting the instance from the fixture's injector guarantees we spy on the exact `MatSnackBar` object the component holds.

**Files:** `bulk-action-bar.component.spec.ts`

---

## DD-024 · CSS Custom Properties for Design Tokens

**Chosen:** All color, spacing, shadow, radius, and typography tokens as CSS custom properties in `:root` and `html.dark-theme`.  
**Rejected:** Sass variables; separate stylesheet per theme; Angular Material `@mixin` override only.

**Why:**
- Runtime-swappable: one class toggle on `<html>` re-scopes every token without a rebuild.
- Inherited by all elements — components reference `var(--ph-*)` without importing anything.
- Works alongside Material 3 `--mat-sys-*` tokens; we extend, not replace, the Material layer.
- WCAG AA contrast ratios documented analytically in `styles.scss` comments (not left to browser heuristics).

**Files:** `styles.scss`

---

## DD-025 · `ThemeService` Signal + `effect()` for DOM Mutation

**Chosen:** `isDark = signal<boolean>()`, `effect(() => document.documentElement.classList.toggle('dark-theme', isDark()))`.  
**Rejected:** Direct `classList.toggle` inside `setDark()`; BehaviorSubject; `setAttribute('class', ...)` in constructor.

**Why:**
- `effect()` is Angular's declared mechanism for reacting to signal changes with DOM side-effects. It runs synchronously on the same tick as the signal write.
- `setDark()` stays pure (signal mutation only); the DOM mutation is a single-responsibility side-effect in the `effect`.
- SSR-safe: the `if (!this.isBrowser) return;` guard inside the effect prevents DOM access on the server.

**Files:** `theme.service.ts`

---

## DD-026 · `@defer (on idle)` for the Policy Table Section

**Chosen:** Wrap the table section (table component + bulk-action bar) in `@defer (on idle)` with a skeleton placeholder.  
**Rejected:** Eagerly instantiate `PolicyTableComponent` on the same render tick as the filter bar and summary panel.

**Why:**
- `PolicyTableComponent` imports `MatTable`, `MatSort`, `MatPaginator`, `MatCheckbox` — a significant Material module footprint. Deferring instantiation until browser idle reduces LCP.
- The filter bar and summary panel paint on the first render tick; the table follows when the browser has spare cycles.
- `@placeholder` and `@loading (minimum 200ms)` show the skeleton screen so the layout doesn't jump.

**Files:** `policy-overview.page.html`

---

## DD-027 · WCAG 2.1 AA Accessibility Baseline

**Chosen:** Full accessibility pass during Phase 8: skip link, landmark roles, `aria-live` regions, `focus-visible` outlines, color + shape + text for all status indicators, `role="dialog"` with focus trap for detail view.  
**Rejected:** Accessibility deferred to a separate phase or post-MVP.

**Why:**
- APAC insurance operations tools are used by teams that may include users with visual or motor impairments.
- WCAG 2.1 AA is the internationally accepted standard for enterprise B2B applications; many enterprise procurement requirements mandate it.
- Accessibility retrofitted late is far more expensive than accessibility built in. Components were designed accessible from Phase 8 onwards.

**Key implementations:**
- `.skip-link` — WCAG 2.4.1 (Level A): skip repeated navigation
- `:focus-visible` global outline — WCAG 2.4.7 (Level AA): visible keyboard focus
- `role="alert"` on `ErrorStateComponent` — assertive; `role="status"` on loading/empty — polite
- `aria-live="polite"` on filter count badge — announced on change
- `cdkFocusInitial` on dialog close button — WCAG 2.4.3 (Focus Order, Level A)

**Files:** `styles.scss`, `app.html`, `loading-skeleton.component.ts`, `empty-state.component.ts`, `error-state.component.ts`, `policy-detail-dialog.component.ts`
