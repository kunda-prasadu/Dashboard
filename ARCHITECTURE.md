# Architecture

## Overview
**Chubb APAC Policy Overview Dashboard** — Angular 20, standalone + zoneless + signals.
Provides real-time visibility into the APAC policy portfolio with server-side filtering, sorting, and pagination.

---

## Folder Structure

```
src/app/
├── core/
│   ├── services/
│   │   └── logger.service.ts          # Dev-only console wrapper, [PolicyHub] prefix, SSR-safe
│   └── interceptors/
│       └── error.interceptor.ts       # Functional interceptor → NormalisedHttpError per HTTP status
├── shared/                            # Reusable presentational components and pipes (Phase 3+)
└── features/
    └── policy-dashboard/
        ├── models/
        │   ├── policy.model.ts        # Policy interface + string union types (no enums)
        │   ├── policy-filter.model.ts # PolicyFilter — all filter surface area
        │   ├── pagination.model.ts    # PageRequest, PolicyPage<T>
        │   └── policy-summary.model.ts# PolicySummaryData + EMPTY_SUMMARY sentinel
        ├── constants/
        │   └── policy.constants.ts    # POLICY_STATUSES, REGIONS, LOBs, CURRENCIES, PAGE_SIZE_OPTIONS, STORAGE_KEYS
        ├── services/
        │   └── policy-api.service.ts  # Stateless HTTP service — getAll/getSummary/patch/flagPolicies
        ├── store/
        │   └── policy.store.ts        # Signal store — single source of truth, optimistic updates
        ├── components/
        │   ├── policy-table/
        │   │   ├── policy-table.component.ts   # Presentational table — reads store signals, emits rowClick
        │   │   ├── policy-table.component.html # mat-table: 9 columns, sticky header/actions, empty state
        │   │   └── policy-table.component.scss # Status/LOB badges, compact layout, Material tokens
        │   ├── policy-filter/
        │   │   ├── policy-filter.component.ts   # Reactive filter bar — dual valueChanges subs, URL+storage sync
        │   │   ├── policy-filter.component.html # Search, multi-selects, date pickers, active-filter chips
        │   │   └── policy-filter.component.scss # Responsive grid layout, chip row
        │   └── summary-panel/
        │       ├── summary-panel.component.ts   # KPI panel — computed signals from store.summary()
        │       ├── summary-panel.component.html # 4 status cards, GWP bars, SVG expiry arc
        │       └── summary-panel.component.scss # Card colors, bar chart, arc animation (reduced-motion aware)
        └── pages/
            └── policy-overview/
                └── policy-overview.page.ts     # Routed shell — composes filter + table, bootstraps loadPolicies()

mock-api/
├── generate-data.js                   # Generates 250 APAC records with realistic distribution → db.json
└── server.js                          # Express ESM — server-side filter/sort/paginate/summarise
```

---

## Layers & Responsibilities

### `core/services/LoggerService`
- Wraps `console.*` methods with a `[PolicyHub]` prefix
- Suppresses `debug` and `info` in production (`isDevMode()`)
- SSR-safe: checks `isPlatformBrowser` before writing to console
- **Why**: Centralised log control — easy to swap to a remote logger later without touching call sites

### `core/interceptors/errorInterceptor`
- Functional interceptor registered via `withInterceptors([errorInterceptor])`
- Maps `HttpErrorResponse` → `NormalisedHttpError { status, message, originalError }`
- User-friendly messages per status code (0, 401, 403, 404, 4xx, 5xx) — never exposes internal server details
- **Why**: Components only handle a typed `NormalisedHttpError`, never raw HTTP errors. Keeps error-handling logic in one place.

### `features/policy-dashboard/services/PolicyApiService`
- Stateless — no signals, no subjects. Pure HTTP → Observable.
- `buildFilterParams()` is private and shared by `getAll()` and `getSummary()` — single source of param-building truth
- `flagPolicies(ids[])` uses `forkJoin` to fire one `PATCH` per id in parallel
- **Why**: Separation of concerns. The store orchestrates state; the service knows only the HTTP contract.

### `core/services/StorageService`
- SSR-safe wrapper around `localStorage` — checks `isPlatformBrowser` before accessing `window`
- Catches storage errors silently (private browsing, quota exceeded)
- **Why**: Centralised storage abstraction — swap backing store without touching callers; prevents SSR crashes

### `features/policy-dashboard/components/SummaryPanelComponent`
- **Reads `store.summary()` only** — a server-computed aggregate over the current filtered set; always consistent with the table
- **4 status cards** — each clickable, emits `statusClick(PolicyStatus)` for drilldown; color + icon + text (never color alone)
- **GWP by LOB bar chart** — `lobEntries()` computed signal sorts by amount desc, normalises widths to the largest bar
- **SVG expiry arc** — `expiryFraction()` computed signal drives `stroke-dashoffset`; `prefers-reduced-motion` disables the CSS transition
- Emits `expiryClick()` for drilldown to active-expiring policies
- **Why server-computed**: Aggregating over one page of table data would give wrong totals. The server applies the same filters to all 250 records.
- **Why SVG arc**: Animatable without JavaScript, works on any background, respects system motion preferences via a single CSS media query

### `features/policy-dashboard/components/PolicyFilterComponent`
- **Reactive form** with two `valueChanges` subscriptions:
  1. **Immediate** → updates `_snapshot` signal for instant chip UI feedback
  2. **`debounceTime(400)` + `distinctUntilChanged`** → calls `store.updateFilters()`, persists to `StorageService`, syncs URL
- **URL sync**: `router.navigate([], { queryParamsHandling: 'merge', replaceUrl: true })` — filters are bookmarkable/shareable
- **Seed priority on init**: URL query params → localStorage → defaults (URL wins so shared links restore the sender's view)
- Active-filter chips with individual `remove` and a "clear all" action
- Accessibility: `role="search"`, `aria-label` on every control and chip button, `aria-live` on filter count
- **Why two subscriptions**: Chips must update on every keystroke; API calls must be debounced. Splitting avoids async chip lag.

### `features/policy-dashboard/components/PolicyTableComponent`
- **Standalone, `ChangeDetectionStrategy.OnPush`** — only re-renders when signal values change
- Presentational: reads `PolicyStore` signals; never calls the API directly
- `[dataSource]="store.policies()"` — renders the current page only (no `MatTableDataSource`)
- `[trackBy]="trackById"` on `<table mat-table>` — avoids full DOM tear-down on page change
- **Controlled paginator**: `[length]`, `[pageIndex]`, `[pageSize]` all bound to store signals; `(page)` → `store.setPage()`
- **Server-side sort**: `(matSortChange)` → `store.updateSort()`; sort state reflected back via `[matSortActive/Direction]`
- Selection: `allSelected` / `someSelected` are `computed()` signals — header checkbox indeterminate state is derived, not stored
- Accessibility: `role="region"` + `aria-label` on container; `aria-label` on every checkbox and icon button; `<th scope="col">`; `*matNoDataRow` empty state
- **Why presentational**: Keeps the component testable without HTTP or real store setup (stub the store signals)

### `features/policy-dashboard/pages/PolicyOverviewPage`
- Lazy-loaded at `/policies` route via `loadComponent`
- Calls `store.loadPolicies()` in `ngOnInit` — one authoritative trigger per navigation
- Composes `PolicyTableComponent`; will add filter panel in Phase 4
- **Why a page shell**: Keeps routing concerns (title, guards) at page level; child components stay route-agnostic

### `features/policy-dashboard/store/PolicyStore`
- `providedIn: 'root'` — one instance for the feature lifetime
- **Private** `signal<T>()` for all state; **public** `.asReadonly()` exposures only
- `computed()` for `selectedCount` and `hasSelection` — no derived state stored redundantly
- `loadPolicies()` uses `forkJoin({ page, summary })` — both requests fire in parallel
- `takeUntilDestroyed(destroyRef)` on every subscription — no manual unsubscribe, no leaks
- Optimistic updates: snapshot → update signal → HTTP → rollback on error (flag + renew)
- **Why signals over NgRx**: single feature, ~¼ the boilerplate, native, zero extra dependencies

---

## State Management Design

```
UI component
  ↓ calls store.updateFilters(filters)
PolicyStore
  ↓ sets _filters signal, resets page to 0
  ↓ calls loadPolicies()
PolicyApiService
  ↓ builds HttpParams from filters + sort + page
  ↓ GET /policies + GET /policies/summary (parallel via forkJoin)
Express mock server
  ↓ applies filter/sort/paginate server-side
  ↓ returns { data: Policy[], total: number }
PolicyStore
  ↓ sets _policies, _total, _summary signals
UI component
  ↑ reacts automatically via signal reads in template
```

No client-side filtering, sorting, or pagination. The browser holds exactly one page of data at a time.

---

## Change Detection

`provideZonelessChangeDetection()` in `app.config.ts`. Zone.js is **not** in the app build polyfills.  
Zone.js **is** in test polyfills — Karma's runner requires it; Angular CD inside tests uses `provideZonelessChangeDetection()`.

All components use `ChangeDetectionStrategy.OnPush`. In a zoneless app this means Angular only checks a component when a signal it reads has changed — no zone triggers, no unnecessary traversals.

---

## HTTP Configuration

`provideHttpClient(withFetch(), withInterceptors([errorInterceptor]))` in `app.config.ts`.
- `withFetch()` — uses the native Fetch API instead of XHR; compatible with zoneless
- `withInterceptors([errorInterceptor])` — functional interceptor chain

---

## Mock API

Custom Express ESM server (`mock-api/server.js`). Chosen over `json-server` because:
- `json-server` ANDs `_like` params — cannot OR-search across `policyNumber`, `policyHolderName`, `underwriter`
- `json-server` has no aggregation/summary endpoint
- Express gives full control over filter logic and response shape

`db.json` is gitignored. Regenerate with `npm run generate:mock`.
