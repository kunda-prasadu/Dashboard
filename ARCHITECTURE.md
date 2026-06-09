# Architecture

## Overview

**Chubb APAC Policy Overview Dashboard** — Angular 20, standalone + zoneless + signals.

Real-time visibility into the APAC policy portfolio. All filtering, sorting, and pagination is server-side; the browser holds one page of data at a time. A custom Express mock API serves 250 realistic APAC records with OR-search, multi-filter, and aggregate summary endpoints.

---

## Application Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / SSR                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   AppComponent                       │   │
│  │  Toolbar  ·  ThemePickerComponent  ·  skip-link      │   │
│  │                  router-outlet                        │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                          │ lazy loadComponent                │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │               PolicyOverviewPage  (/policies)         │  │
│  │                                                       │  │
│  │  PolicyFilterComponent  ──────────────────────────┐  │  │
│  │  SummaryPanelComponent   ──────────────────────────┤  │  │
│  │  BulkActionBarComponent  (conditional)  ───────────┤  │  │
│  │                                                    ▼  │  │
│  │  @defer (on idle) ─── PolicyTableComponent        │  │  │
│  │                                                    │  │  │
│  │  PolicyDetailDialog  (on rowClick)  ───────────────┘  │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                            │ inject                          │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │                    PolicyStore                          │ │
│  │  signal<Policy[]>   signal<number>   signal<Summary>   │ │
│  │  signal<Filter>     signal<Sort>     signal<PageReq>   │ │
│  │  signal<Set<id>>    signal<string|null>  (error)        │ │
│  │                           │ inject                      │ │
│  │              PolicyApiService  ◄───────────────────────┘ │
│  │                           │                              │
│  └───────────────────────────┼──────────────────────────────┘
│                              │ HttpClient
├──────────────────────────────┼──────────────────────────────┤
│           Express Mock API   │  :3000                        │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │  GET /policies       ← filter + sort + paginate       │  │
│  │  GET /policies/summary ← filter + aggregate           │  │
│  │  GET /policies/:id                                    │  │
│  │  PATCH /policies/:id  ← in-memory update              │  │
│  │                                                       │  │
│  │  applyFilters() ─ OR search, multi-status, date range │  │
│  │  applySort()                                          │  │
│  │  db.json ← 250 APAC records (gitignored)              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
src/app/
├── app.config.ts                  # Bootstrap — providers, router, HTTP, SSR
├── app.routes.ts                  # Lazy-loaded /policies route
├── app.ts                         # Root component — toolbar + skip-link + router-outlet
│
├── core/
│   ├── services/
│   │   ├── logger.service.ts      # Dev-only console wrapper, [PolicyHub] prefix, SSR-safe
│   │   ├── storage.service.ts     # Sole localStorage gateway — SSR-safe, quota-safe
│   │   └── theme.service.ts       # isDark signal + effect → html.dark-theme DOM class
│   └── interceptors/
│       └── error.interceptor.ts   # HttpInterceptorFn → NormalisedHttpError
│
├── shared/
│   ├── loading-skeleton/          # Skeleton: filter bar + 4 cards + 8 table rows
│   ├── empty-state/               # role="status", clearFilters output
│   ├── error-state/               # role="alert", retry output
│   └── theme-picker/              # role="switch" toggle — light ↔ dark
│
└── features/
    └── policy-dashboard/
        ├── models/
        │   ├── policy.model.ts         # Policy + string union types (no enums)
        │   ├── policy-filter.model.ts  # PolicyFilter — full filter surface area
        │   ├── pagination.model.ts     # PageRequest, PolicyPage<T>
        │   └── policy-summary.model.ts # PolicySummaryData + EMPTY_SUMMARY
        ├── constants/
        │   └── policy.constants.ts     # POLICY_STATUSES, REGIONS, LOBS, CURRENCIES,
        │                               # PAGE_SIZE_OPTIONS, STORAGE_KEYS
        ├── services/
        │   └── policy-api.service.ts   # Stateless HTTP — getAll/getSummary/patch/flagPolicies
        ├── store/
        │   └── policy.store.ts         # Signal store — SSoT, optimistic updates, forkJoin
        ├── components/
        │   ├── policy-table/           # Presentational: reads store signals, emits rowClick
        │   ├── policy-filter/          # Reactive form: dual subs, URL + storage sync, chips
        │   ├── summary-panel/          # KPI: status cards, GWP bars, SVG arc
        │   ├── bulk-action-bar/        # Flag batch + retry, snackbar feedback
        │   └── policy-detail-dialog/   # Focus-trapped detail view via MatDialog
        └── pages/
            └── policy-overview/        # Routed shell — state machine, @defer table

mock-api/
├── generate-data.js   # Generates 250 APAC records → db.json
└── server.js          # Express ESM — filter / sort / paginate / summarise / PATCH
```

---

## `PolicyStore` Signal Map

```
┌────────────────────────────────────────────────────────────┐
│                      PolicyStore                           │
│                                                            │
│  Private signals (write)          Public readonly signals  │
│  ─────────────────────────        ───────────────────────  │
│  _policies: signal<Policy[]>   → policies()               │
│  _total:    signal<number>     → total()                  │
│  _summary:  signal<Summary>    → summary()                │
│  _filters:  signal<Filter>     → filters()                │
│  _sort:     signal<Sort>       → sort()                   │
│  _pagination: signal<Page>     → pagination()             │
│  _loading:  signal<boolean>    → loading()                │
│  _error:    signal<string|null>→ error()                  │
│  _selectedIds: signal<Set>     → selectedIds()            │
│  _lastFailedFlagIds: signal[]  → lastFailedFlagIds()      │
│                                                            │
│  Computed signals                                          │
│  ──────────────                                            │
│  selectedCount = computed(() => _selectedIds().size)      │
│  hasSelection  = computed(() => selectedCount() > 0)      │
│                                                            │
│  Public methods                                            │
│  ──────────────                                            │
│  loadPolicies()          forkJoin(page + summary)         │
│  updateFilters(f)        reset page → loadPolicies()      │
│  updateSort(f, o)        reset page → loadPolicies()      │
│  setPage(i, size)        persist page size → loadPolicies │
│  clearFilters()          reset filters + page             │
│  toggleSelection(id)     add/remove from Set              │
│  selectAll()             add all current page ids         │
│  clearSelection()        clear Set                        │
│  flagSelectedPolicies()  optimistic + HTTP + rollback     │
│  retryLastFailedFlag()   restore failed ids + retry       │
│  renewPolicy(id)         optimistic status + HTTP + rollback│
└────────────────────────────────────────────────────────────┘
```

---

## HTTP / Data Flow

### Normal load (filter or page change)

```
User changes filter or page
       │
       ▼
PolicyFilterComponent / PolicyTableComponent
       │ store.updateFilters(f) / store.setPage(i, size)
       ▼
PolicyStore
  _filters.set(f) + _pagination.update(reset to 0)
  _loading.set(true)
  _error.set(null)
       │
       ▼
  forkJoin({
    page:    PolicyApiService.getAll(filters, sort, page),
    summary: PolicyApiService.getSummary(filters)
  })
       │ parallel HTTP (both fire simultaneously)
       ├──► GET /policies?search=...&status[]=...&sort=...&page=...&pageSize=...
       └──► GET /policies/summary?search=...&status[]=...
                    │
                    ▼ Express mock server
              applyFilters() → applySort() → slice(start, end)
                    │
                    ▼
  { data: Policy[], total: number }    { active, pending, ... }
       │
       ▼
PolicyStore
  _policies.set(data)
  _total.set(total)
  _summary.set(summary)
  _loading.set(false)
       │
       ▼
All components reading these signals re-render automatically
(Angular OnPush + zoneless — no manual detectChanges)
```

### Bulk flag flow (optimistic update + rollback)

```
User selects rows → clicks "Flag for Review"
       │
       ▼
BulkActionBarComponent.flagForReview()
  count = store.selectedCount()        ← guard: no-op if 0
  store.flagSelectedPolicies()
    │
    ▼ PolicyStore.flagSelectedPolicies()
    snapshot = [..._policies()]
    _policies.update(optimistic flag set)   ← instant UI
    _selectedIds.set(new Set())
    api.flagPolicies(ids)               ← forkJoin of PATCHes
    │
    ├── SUCCESS → tap(confirmedPolicies => merge into _policies)
    │                component shows "N policies flagged" snackbar
    └── ERROR  → catchError → rollback snapshot + set error
                              set _lastFailedFlagIds
                              throwError (re-emits to subscriber)
                              component shows "Failed" snackbar + Retry

User clicks Retry
  store.retryLastFailedFlag()
  → _selectedIds.set(new Set(lastFailedIds))
  → flagSelectedPolicies() (same flow as above)
```

---

## Component Hierarchy

```
AppComponent
├── <a class="skip-link">           ← WCAG 2.4.1 skip-nav
├── <mat-toolbar>
│   ├── app-title                   ← role="banner"
│   └── ThemePickerComponent        ← role="switch"
└── <router-outlet>
    └── PolicyOverviewPage  (lazy, /policies)
        ├── <main id="main-content">
        │   ├── PolicyFilterComponent
        │   │   ├── <mat-form-field> search
        │   │   ├── <mat-select> status (multi)
        │   │   ├── <mat-select> region (multi)
        │   │   ├── <mat-select> LOB (multi)
        │   │   ├── <mat-select> currency (multi)
        │   │   ├── <mat-datepicker> effective date range
        │   │   ├── <mat-datepicker> expiry date range
        │   │   ├── <mat-input> premium min / max
        │   │   └── active-filter chip row
        │   │
        │   ├── @if (loading && !policies.length)
        │   │   └── LoadingSkeletonComponent   ← role="status" aria-busy
        │   │
        │   ├── @else if (error)
        │   │   └── ErrorStateComponent        ← role="alert"
        │   │
        │   └── @else
        │       ├── SummaryPanelComponent
        │       │   ├── 4× status cards (color + icon + text)
        │       │   ├── GWP-by-LOB bar chart
        │       │   └── SVG expiry arc (stroke-dashoffset)
        │       │
        │       ├── @if (hasSelection)
        │       │   └── BulkActionBarComponent
        │       │       ├── selection count badge (aria-live)
        │       │       ├── Flag for Review button
        │       │       └── Clear Selection button
        │       │
        │       └── @defer (on idle)
        │           ├── @placeholder → LoadingSkeletonComponent
        │           ├── @loading (min 200ms) → LoadingSkeletonComponent
        │           └── @if (total === 0)
        │               │   EmptyStateComponent  ← role="status"
        │               └── PolicyTableComponent
        │                   ├── <mat-checkbox> select all (indeterminate)
        │                   ├── <mat-sort-header> columns
        │                   ├── <tr mat-row> × N (row checkboxes, action buttons)
        │                   ├── *matNoDataRow empty state
        │                   └── <mat-paginator>
        │
        └── PolicyDetailDialogComponent  (MatDialog overlay)
            ├── Policy fields display
            ├── Status badge (color + text)
            └── Close button (cdkFocusInitial, restoreFocus: true)
```

---

## Core Services

### `StorageService`
- **Single point of contact** for `localStorage` — enforced by grep rule
- SSR-safe: `isPlatformBrowser(PLATFORM_ID)` check before every access
- try/catch around every call (quota exceeded, private browsing security errors)
- Generic `get<T>()` / `set()` / `remove()` — JSON serialise/deserialise transparently

### `ThemeService`
- `isDark = signal<boolean>` — single source of truth for active theme
- `toggle()` / `setDark(bool)` — mutate signal + persist via `StorageService`
- `effect()` mirrors `isDark` onto `document.documentElement.classList` (`dark-theme` class)
- Init priority: stored value → `prefers-color-scheme` → light
- SSR-safe: `isBrowser` guard inside the effect

### `LoggerService`
- Wraps `console.log/warn/error` with `[PolicyHub]` prefix
- Suppresses `debug` and `info` in production (`isDevMode()`)
- SSR-safe: checks `isPlatformBrowser`

### `errorInterceptor` (functional)
- Registered via `withInterceptors([errorInterceptor])` in `app.config.ts`
- Maps `HttpErrorResponse` → `NormalisedHttpError { status, message, originalError }`
- User-friendly messages per status code: `0` → network error, `401` → unauthorised, `403` → forbidden, `404` → not found, `4xx` → bad request, `5xx` → server error

---

## Change Detection

`provideZonelessChangeDetection()` in `app.config.ts`. Zone.js is **not** in the app build polyfills.

Zone.js **is** in test polyfills — Karma's runner requires it. Angular CD inside tests uses `provideZonelessChangeDetection()` in every `TestBed`.

All components use `ChangeDetectionStrategy.OnPush`. In a zoneless app this means Angular only checks a component when a signal it reads has changed — no zone triggers, no unnecessary traversals.

---

## HTTP Configuration

```typescript
provideHttpClient(
  withFetch(),                          // Fetch API instead of XHR — zoneless compatible
  withInterceptors([errorInterceptor])  // Functional interceptor chain
)
```

---

## Testing Strategy

| Layer | Approach |
|---|---|
| `PolicyApiService` | `HttpTestingController` — asserts exact URL, params, method, and response mapping |
| `PolicyStore` | Spy on `PolicyApiService`; assert signal values after each mutating call; optimistic + rollback paths |
| `PolicyFilterComponent` | Stub store + storage; test form→store mapping, URL seeding, chip removal, debounce |
| `PolicyTableComponent` | Stub store signals; test sort/page/select delegation, `formatPremium` branches |
| `BulkActionBarComponent` | Stub store; `spyOn` `MatSnackBar` via `fixture.debugElement.injector.get()` |
| `ThemeService` | Stub `StorageService`; assert `isDark` signal and `StorageService.set` calls |
| `errorInterceptor` | `HttpTestingController`; exercise 4xx, 5xx, and network-error branches |

**Phase 9 coverage baseline — 107 tests:**

| Metric | Coverage |
|---|---|
| Statements | 94.88% |
| **Branches** | **86.46%** |
| Functions | 92.30% |
| Lines | 96.80% |
