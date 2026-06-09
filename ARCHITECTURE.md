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
        ├── components/                # (Phase 3) Smart + presentational components
        └── pages/                     # (Phase 3) Routed page shells

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

All components: `ChangeDetectionStrategy.OnPush` (enforced in Phase 3+).

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
