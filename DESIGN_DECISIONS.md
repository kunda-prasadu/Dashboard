# Design Decisions

Each decision records **what** was chosen, **why**, and what was **rejected**.

---

## 1. Zoneless Angular (`provideZonelessChangeDetection`)

**Chosen:** Remove zone.js from app polyfills. Use `provideZonelessChangeDetection()`.  
**Rejected:** Default zone.js-based change detection.  
**Why:** Explicit, predictable rendering. No surprise re-renders from unrelated async operations. Aligns with Angular's long-term direction. Forces developers to be intentional about when the UI updates.  
**Caveat:** `zone.js` is still in test polyfills — Karma's runner requires it. Angular CD inside tests is still zoneless via `provideZonelessChangeDetection()` in each `TestBed`.

---

## 2. Signal Store over NgRx

**Chosen:** Custom `PolicyStore` using `signal<T>()`, `computed()`, `effect()`.  
**Rejected:** NgRx (actions/reducers/selectors/effects) and NgRx Signal Store.  
**Why:**
- Single feature scope — NgRx overhead (~4× the code) is unjustified.
- Signals are Angular-native (17+), zero extra dependencies.
- Optimistic updates are natural: snapshot → mutate signal → HTTP → rollback. NgRx needs `optimisticUpdate` from `@ngrx/effects` plus paired action types.
- `computed()` replaces selectors without the boilerplate.

---

## 3. String Unions over TypeScript Enums

**Chosen:** `type PolicyStatus = 'Active' | 'Expired' | 'Pending' | 'Cancelled'`  
**Rejected:** `enum PolicyStatus { Active = 'Active', ... }`  
**Why:**
- No runtime overhead — enums compile to objects; unions are erased entirely.
- Tree-shakeable — unused union members are eliminated by the bundler.
- Work natively with template literal types and `switch`/exhaustive checks.
- No import needed in templates — string literals are self-documenting.

---

## 4. Server-Side Filtering, Sorting, and Pagination

**Chosen:** All filter/sort/paginate logic in the Express mock server.  
**Rejected:** Load all 250 records, filter/sort client-side, paginate a local array.  
**Why:** The brief explicitly requires server-side operations. Client-side approaches break at production scale (thousands of records), inflate the initial payload, and violate the stated requirement.  
**Implementation:** The browser holds exactly one page of data (`_policies` signal). The server returns `{ data: Policy[], total: number }`.

---

## 5. Custom Express Server over json-server

**Chosen:** Hand-written Express ESM server (`mock-api/server.js`).  
**Rejected:** `json-server` with `_like` query params.  
**Why:** `json-server` ANDs multiple `_like` params — it cannot OR-search across `policyNumber`, `policyHolderName`, and `underwriter`. It also has no aggregation endpoint for the `/summary` route. Express gives full control over filter logic and response shape with ~150 lines of straightforward code.

---

## 6. Functional HTTP Interceptor

**Chosen:** `errorInterceptor: HttpInterceptorFn` registered via `withInterceptors([])`.  
**Rejected:** Class-based `HttpInterceptor` implementing the old interface.  
**Why:** Functional interceptors are stateless, do not need class instantiation, and compose cleanly with `withInterceptors`. They are the Angular 17+ idiomatic approach and align with the standalone/zoneless architecture.

---

## 7. Angular Material 3 (Local Icons)

**Chosen:** `@angular/material@20` + `material-icons` npm package in `angular.json` styles.  
**Rejected:** CDN `<link>` for Material Icons (what `ng add` installs by default).  
**Why:** CDN dependency is a reliability and security risk. Local package works offline, in air-gapped environments, and avoids CORS issues. The `material-icons` package adds ~200 kB to styles — acceptable; icon subsetting adds build complexity not justified at this stage.

---

## 22. `flagSelectedPolicies()` Returns `Observable<Policy[]>`

**Chosen:** Store method returns a piped Observable (tap + catchError + throwError). Caller subscribes and handles snackbar feedback.  
**Rejected:** Store subscribes internally (`void` return); caller notified via a separate Subject or effect.  
**Why:**
- One Observable carries both the data and the error signal — the caller doesn't need a second notification channel.
- State mutations (optimistic update, rollback, `_lastFailedFlagIds`) stay in `tap`/`catchError` inside the store.
- UI concerns (snackbar message, plural text, retry wiring) stay in the component.
- The pattern is standard RxJS — no Angular-specific indirection required.

---

## 23. Snackbar Spy via `fixture.debugElement.injector.get()`

**Chosen:** In tests, obtain `MatSnackBar` from `fixture.debugElement.injector.get(MatSnackBar)` and call `spyOn` on the instance.  
**Rejected:** Provide a `jasmine.createSpyObj` at `TestBed` level as `{ provide: MatSnackBar, useValue: spy }`.  
**Why:** Standalone components import `MatSnackBarModule` directly into their own injector scope. A spy provided at the root TestBed level is shadowed by the module-level provider inside the component. Getting the instance from the fixture's injector guarantees we spy on the exact object the component holds.

---

## 8. `takeUntilDestroyed(destroyRef)` in Method Scope

**Chosen:** Inject `DestroyRef` explicitly and pass it to every `takeUntilDestroyed(this.destroyRef)` call.  
**Rejected:** `takeUntilDestroyed()` with no argument (AI default).  
**Why:** `takeUntilDestroyed()` without arguments only works inside an injection context (constructor or field initialiser). Calling it inside a method at runtime throws. The `DestroyRef` token must be injected in the constructor and passed explicitly to all method-level operators.

---

## 19. Server-Computed Summary (Never Client Aggregation)

**Chosen:** `SummaryPanelComponent` reads `store.summary()` — returned by `GET /policies/summary` which applies the same filters as `/policies` over all 250 records.
**Rejected:** Aggregating the current page of 25 records client-side.
**Why:** A page holds at most 25 records. Summing `premiumAmount` over 25 records when 200 match the filter would give wildly wrong totals. The server has the full filtered dataset; the client has one page.

---

## 20. SVG Arc for Expiry Indicator

**Chosen:** SVG `<circle>` with `stroke-dashoffset` driven by a `computed()` signal.
**Rejected:** CSS `conic-gradient` or a canvas-based chart.
**Why:**
- `stroke-dashoffset` is directly animatable via CSS `transition` — no JS animation loop.
- `prefers-reduced-motion` disables the transition at the CSS level; no JS media-query check needed.
- Works on any background color and scales cleanly with `viewBox`.
- Pure SVG — no third-party chart library added to the bundle.

---

## 21. Color Is Never the Sole Signal on Status Cards

**Chosen:** Each status card has a background color AND a `mat-icon` shape AND a text label.
**Rejected:** Color-only differentiation.
**Why:** WCAG 1.4.1 (Level A) requires that color is not the only means of conveying information. Users with colour blindness distinguish cards by icon shape alone; screen readers read the `aria-label` with the embedded count.

---

## 15. Two `valueChanges` Subscriptions in `PolicyFilterComponent`

**Chosen:** Immediate subscription for chips snapshot + debounced subscription for API/storage/URL.
**Rejected:** A single debounced subscription driving both chips and the API call.
**Why:** If chips were debounced, they would lag 400 ms behind the user's selection — jarring UX. Splitting subscriptions gives instant chip feedback while protecting the API from excessive requests. Both subscriptions share the same `destroyRef` for clean teardown.

---

## 16. URL Query Param Sync for Filters

**Chosen:** `router.navigate([], { queryParamsHandling: 'merge', replaceUrl: true })` after every debounced filter change.
**Rejected:** Filters only in localStorage (not reflected in URL).
**Why:** URL-persisted filters make views bookmarkable and shareable — a user can send a filtered URL to a colleague who sees the exact same result. `replaceUrl: true` prevents the browser history from filling with intermediate filter states.

---

## 17. Seed Priority: URL → localStorage → defaults

**Chosen:** On component init, URL query params take highest priority, then localStorage, then empty defaults.
**Rejected:** Always seed from localStorage regardless of URL.
**Why:** When a user opens a shared link, the URL must override their local preferences to show the sender's exact filtered view. localStorage is a personal preference cache — it should only apply when no explicit URL context exists.

---

## 18. `StorageService` as SSR-safe `localStorage` Abstraction

**Chosen:** A dedicated `StorageService` that checks `isPlatformBrowser` before every access.
**Rejected:** Calling `localStorage` directly in store/component code.
**Why:** The app has an SSR shell — `localStorage` is unavailable on the server and throws. A centralised service is also the only place that needs to change if the storage mechanism changes (e.g., `sessionStorage`, encrypted storage).

---

## 10. Presentational Component Pattern for `PolicyTableComponent`

**Chosen:** Component reads `PolicyStore` signals and emits `output()` events. No `HttpClient` injection.  
**Rejected:** Smart component that calls `PolicyApiService` directly.  
**Why:** Keeps the component testable with a simple stub — no `HttpTestingController`, no real store setup needed. Also means the same table can be reused in a different page or dialog without bringing its own data-fetching logic.

---

## 11. Controlled `MatPaginator` (No `MatTableDataSource`)

**Chosen:** Bind `[length]`, `[pageIndex]`, `[pageSize]` directly to store signals; delegate `(page)` events to `store.setPage()`.  
**Rejected:** Attaching the paginator to `MatTableDataSource` (Angular Material default).  
**Why:** `MatTableDataSource` paginates client-side. It assumes all records are in memory and slices them locally. Our store holds one server page at a time — attaching `MatTableDataSource` would silently paginate within 25 records instead of fetching the next 25 from the server.

---

## 12. `trackBy` on `<table mat-table>`, Not on `*matRowDef`

**Chosen:** `[trackBy]="trackById"` attribute on the `<table mat-table>` element.  
**Rejected:** `[trackBy]` on the `<tr *matRowDef>` element (AI default).  
**Why:** Angular Material's `CdkTable` reads `trackBy` from the table host element, not from the row definition directive. Placing it on the row def silently does nothing and causes a compile error in strict template checking.

---

## 13. Lazy-Loaded Page Shell via `loadComponent`

**Chosen:** `/policies` route uses `loadComponent` to lazy-load `PolicyOverviewPage`.  
**Rejected:** Eagerly importing `PolicyOverviewPage` in `app.routes.ts`.  
**Why:** The table imports Angular Material modules (table, sort, paginator, checkbox, icons) which add ~250 kB to the initial bundle. Lazy-loading keeps the shell tiny and only pays that cost when the user navigates to `/policies`.

---

## 14. `formatPremium` — Compact M/K Notation

**Chosen:** `S$1.2M`, `S$450K`, `S$1,200` — compact locale-aware display.  
**Rejected:** Full number formatting (`S$1,250,000`).  
**Why:** Premium values range from 1,000 to 5,000,000. Full numbers in a table column create visual noise and force the column too wide. Compact notation gives enough precision for portfolio scanning without overwhelming the layout.

---

## 9. `forkJoin` for Parallel Page + Summary Fetch

**Chosen:** `forkJoin({ page: getAll(...), summary: getSummary(...) })` in `loadPolicies()`.  
**Rejected:** Sequential `getAll().pipe(switchMap(() => getSummary()))`.  
**Why:** Page data and summary are independent — there is no reason to wait for one before firing the other. `forkJoin` halves the perceived load time on every navigation and filter change.
