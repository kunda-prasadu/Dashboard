# Trade-offs

Honest accounting of what we gave up for each architectural choice.

---

## Zoneless + Karma Tests

**Gain:** Explicit, predictable change detection in the app.  
**Cost:** `zone.js` must stay in test polyfills (`angular.json`) so Karma's runner works. This triggers `NG0914` warnings in test output — cosmetic only. Every `TestBed` must include `provideZonelessChangeDetection()` manually; easy to forget.  
**Mitigation:** Warning is suppressed in CI output by grep; `provideZonelessChangeDetection()` added to every spec as a pattern.

---

## Custom Signal Store vs NgRx Signal Store

**Gain:** Zero extra dependencies, ~¼ the code, native Angular.  
**Cost:** No time-travel debugging, no Redux DevTools, no action log. Harder to audit state changes across a long session.  
**Mitigation:** Acceptable at this scope. If the feature grows to 3+ slices with cross-feature state, NgRx Signal Store should be revisited.

---

## Custom Express Server vs json-server

**Gain:** Correct OR-search, full control over filter logic, `/summary` aggregation.  
**Cost:** ~150 lines of boilerplate to maintain. Any schema change requires updating both `generate-data.js` and `server.js`.  
**Mitigation:** Both files are small and co-located under `mock-api/`. Changes are mechanical.

---

## Server-Side Pagination (No Adjacent-Page Cache)

**Gain:** Simple state (`_policies` holds one page), guaranteed data freshness.  
**Cost:** Every back-navigation fires a new HTTP request. No instant page-flip like a pre-fetched cache would give.  
**Mitigation:** Requests hit a local mock server — latency is negligible in dev. In production, a sliding window cache could be added to `PolicyStore` without changing the API contract.

---

## String Unions vs Enums

**Gain:** Zero runtime overhead, tree-shakeable, template-friendly.  
**Cost:** No runtime narrowing helper (e.g., `PolicyStatus[value]` lookup). Typos in string literals are caught only at compile time.  
**Mitigation:** TypeScript strict mode catches all mismatches at compile time. Constants arrays (`POLICY_STATUSES`) provide the runtime list when needed.

---

## `forkJoin` for Page + Summary

**Gain:** Both requests fire in parallel — faster perceived load.  
**Cost:** If either request fails, `forkJoin` cancels both and emits the error. A partial success (page loaded but summary failed) is not possible.  
**Mitigation:** The error interceptor normalises the error and the store sets a user-friendly message. Both endpoints are served by the same Express process, so simultaneous failure is rare. In production, `combineLatest` with error isolation per stream would be the upgrade path.

---

## Material Icons Local Package (~200 kB CSS)

**Gain:** No CDN dependency, works offline, no CORS risk.  
**Cost:** Full icon font added to styles bundle even if only a fraction of icons are used.  
**Mitigation:** Acceptable for a dashboard application. Icon subsetting via a build plugin (e.g., `fontmin`) is the production upgrade path.

---

## Controlled Paginator vs `MatTableDataSource`

**Gain:** True server-side pagination — each page change hits the API; `store.total()` drives the paginator length.  
**Cost:** More wiring — three bindings (`[length]`, `[pageIndex]`, `[pageSize]`) plus a `(page)` handler vs. one `[dataSource]` assignment.  
**Mitigation:** The extra bindings are declarative and live entirely in the template; the component stays clean.

---

## Compact Premium Formatting (`formatPremium`)

**Gain:** Consistent, readable column — no wide numbers breaking the table layout.  
**Cost:** Precision loss — `S$1.25M` rounds to `S$1.3M`. An underwriter needing the exact figure must open the detail view.  
**Mitigation:** The detail view (Phase 4+) shows the full unformatted amount. The table is a scanning tool, not an audit tool.

---

## Lazy-Loaded Page Shell

**Gain:** Initial bundle stays small (~264 kB); Material modules only load on navigation to `/policies`.  
**Cost:** First navigation to `/policies` has a small chunk-load delay (~1 kB chunk in dev; negligible in prod with preloading).  
**Mitigation:** Angular's `PreloadAllModules` strategy or a route-level `prefetchOn: 'hover'` can eliminate the perceived delay.

---

## Optimistic Updates without Confirmation

**Gain:** Instant UI feedback — flagging a policy feels immediate.  
**Cost:** On network error, the UI shows a brief flash of the optimistic state before rollback. Users may find this jarring.  
**Mitigation:** Rollback is synchronous (signal update) so the flash is sub-frame. A toast notification on rollback tells the user what happened. `_lastFailedFlagIds` is exposed so the UI can highlight the affected rows.
