# Chubb APAC Policy Overview Dashboard

A production-quality insurance policy management dashboard built with **Angular 20 (standalone + zoneless + signals)**, **Angular Material 3**, and a **custom Express mock API**. Designed for Chubb APAC operations to give underwriters and operations teams real-time visibility into the regional policy portfolio.

---

## Features

- **Policy table** — server-side sort, filter, and pagination over 250 APAC records
- **Summary KPI panel** — live status counts, total GWP, expiry arc indicator, GWP-by-LOB bar chart
- **Advanced filter bar** — free-text search, multi-select status/region/LOB/currency, date range pickers, premium range; URL + localStorage sync; bookmarkable links
- **Bulk action** — select multiple policies, flag for review in one request batch with optimistic UI and retry
- **Policy detail dialog** — focus-trapped, keyboard-navigable, `restoreFocus` on close
- **Light / dark theme** — user-controlled, persisted to localStorage, respects `prefers-color-scheme` on first visit
- **Accessibility** — WCAG 2.1 AA: skip link, landmark roles, `aria-live` regions, focus-visible outlines, color is never the sole status signal
- **SSR-ready** — `StorageService` and `ThemeService` guard all browser-only APIs

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 20 — standalone components, `ChangeDetectionStrategy.OnPush`, zoneless |
| UI Library | Angular Material 3 (local icons via npm, no CDN) |
| State management | Custom `PolicyStore` using `signal<T>()`, `computed()`, `effect()` — no NgRx |
| HTTP | `HttpClient` with `withFetch()` + functional `errorInterceptor` |
| Mock API | Custom Express ESM server — server-side filter / sort / paginate / summarise |
| Testing | Jasmine + Karma · 107 specs · Branches 86.5% · Statements 94.9% |
| Styles | SCSS · CSS custom property design tokens · `html.dark-theme` class toggle |

---

## Prerequisites

| Requirement | Minimum version |
|---|---|
| Node.js | `>=24.0.0` |
| npm | `>=11` |
| Angular CLI | `>=20` (`npm i -g @angular/cli`) |

---

## Setup

Open **two terminals** — the API server and the Angular dev server must run concurrently.

**Terminal 1 — install dependencies and start the mock API:**
```bash
npm install
npm run generate:mock      # Creates db.json with 250 APAC policy records
npm run start:api          # Starts Express on http://localhost:3000
```

**Terminal 2 — start the Angular dev server:**
```bash
npm start                  # Starts Angular on http://localhost:4200
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

> **Note:** `db.json` is gitignored. Run `generate:mock` once after a fresh clone or whenever you want a fresh dataset. PATCH operations update the in-memory dataset only — restart the API to reset.

---

## Scripts Reference

| Script | Command | Description |
|---|---|---|
| `start` | `ng serve` | Angular dev server on :4200 |
| `start:api` | `node mock-api/server.js` | Express mock API on :3000 |
| `generate:mock` | `node mock-api/generate-data.js` | (Re)generate `db.json` with 250 records |
| `build` | `ng build` | Production build (browser + SSR bundles) |
| `test` | `ng test` | Jasmine/Karma test runner |
| `watch` | `ng build --watch --configuration development` | Dev build with incremental rebuilds |
| `serve:ssr:policy-dashboard` | `node dist/.../server.mjs` | Serve the SSR build locally |

### Run tests with coverage report
```bash
ng test --no-watch --code-coverage
```
Coverage thresholds (Phase 9 baseline):

| Metric     | Coverage |
|------------|----------|
| Statements | 94.88%   |
| Branches   | 86.46%   |
| Functions  | 92.30%   |
| Lines      | 96.80%   |

---

## Project Structure

```
Dashboard/
├── src/
│   └── app/
│       ├── app.config.ts                  # Bootstrap: providers, router, HTTP, SSR
│       ├── app.routes.ts                  # Lazy-loaded route to /policies
│       ├── app.ts                         # Root component — toolbar + skip link + router-outlet
│       ├── core/
│       │   ├── services/
│       │   │   ├── logger.service.ts      # Dev-only console wrapper, [PolicyHub] prefix, SSR-safe
│       │   │   ├── storage.service.ts     # Sole localStorage gateway — SSR-safe, quota-safe
│       │   │   └── theme.service.ts       # isDark signal + effect → html.dark-theme class
│       │   └── interceptors/
│       │       └── error.interceptor.ts   # HttpInterceptorFn → NormalisedHttpError per status code
│       ├── shared/
│       │   ├── loading-skeleton/          # Skeleton screen — filter bar + 4 cards + 8 table rows
│       │   ├── empty-state/               # role="status" + clearFilters output
│       │   ├── error-state/               # role="alert" + retry output
│       │   └── theme-picker/              # role="switch" toggle button, persists via ThemeService
│       └── features/
│           └── policy-dashboard/
│               ├── models/
│               │   ├── policy.model.ts        # Policy + string union types (no enums)
│               │   ├── policy-filter.model.ts # PolicyFilter — full filter surface area
│               │   ├── pagination.model.ts    # PageRequest, PolicyPage<T>
│               │   └── policy-summary.model.ts# PolicySummaryData + EMPTY_SUMMARY
│               ├── constants/
│               │   └── policy.constants.ts    # POLICY_STATUSES, REGIONS, LOBS, CURRENCIES,
│               │                              # PAGE_SIZE_OPTIONS, STORAGE_KEYS
│               ├── services/
│               │   └── policy-api.service.ts  # Stateless HTTP — getAll/getSummary/patch/flagPolicies
│               ├── store/
│               │   └── policy.store.ts        # Signal store — SSoT, optimistic updates, forkJoin
│               ├── components/
│               │   ├── policy-table/          # Presentational: controlled paginator, server sort
│               │   ├── policy-filter/         # Reactive form: dual subs, URL + storage sync, chips
│               │   ├── summary-panel/         # KPI: 4 status cards, GWP bars, SVG arc
│               │   ├── bulk-action-bar/       # Flag-for-review batch + retry, snackbar feedback
│               │   └── policy-detail-dialog/  # Focus-trapped detail view via MatDialog
│               └── pages/
│                   └── policy-overview/       # Routed shell — state machine, @defer table
├── mock-api/
│   ├── generate-data.js                   # Generates 250 realistic APAC records → db.json
│   └── server.js                          # Express ESM: filter/sort/paginate/summarise/PATCH
└── docs/                                  # (see ARCHITECTURE, DESIGN_DECISIONS, TRADE_OFFS)
```

---

## API Contract

> Base URL: `http://localhost:3000`  
> All filter parameters accepted by `/policies` are also accepted by `/policies/summary` (pagination/sort are ignored for the summary endpoint).

### `GET /policies`

Returns a paginated, sorted, filtered page of policies.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `search` | `string` | Free-text OR-search across `policyNumber`, `policyHolderName`, `underwriter` |
| `status` | `string[]` | Repeat for multiple values. Valid: `Active`, `Pending`, `Expired`, `Cancelled` |
| `region` | `string[]` | Repeat for multiple. E.g. `Singapore`, `Japan`, `Australia` |
| `lineOfBusiness` | `string[]` | Repeat for multiple. E.g. `Marine`, `Property`, `Casualty` |
| `currency` | `string[]` | Repeat for multiple. E.g. `SGD`, `JPY`, `AUD` |
| `premiumMin` | `number` | Minimum `premiumAmount` (inclusive) |
| `premiumMax` | `number` | Maximum `premiumAmount` (inclusive) |
| `effectiveDateFrom` | `YYYY-MM-DD` | Effective date ≥ value |
| `effectiveDateTo` | `YYYY-MM-DD` | Effective date ≤ value |
| `expiryDateFrom` | `YYYY-MM-DD` | Expiry date ≥ value |
| `expiryDateTo` | `YYYY-MM-DD` | Expiry date ≤ value |
| `flaggedForReview` | `boolean` | `true` or `false` |
| `sort` | `string` | Field name to sort by. Default: `expiryDate` |
| `order` | `asc` \| `desc` | Sort direction. Default: `asc` |
| `page` | `number` | 1-based page number. Default: `1` |
| `pageSize` | `number` | Records per page (1–100). Default: `20` |

**Response:**
```json
{
  "data": [ /* Policy[] */ ],
  "total": 87
}
```

---

### `GET /policies/summary`

Returns aggregate KPIs over the same filtered set (pagination/sort ignored).

Accepts the same filter parameters as `GET /policies`.

**Response:**
```json
{
  "active": 42,
  "pending": 18,
  "expired": 21,
  "cancelled": 6,
  "totalPremium": 12450000,
  "expiringWithin30Days": 4,
  "gwpByLob": {
    "Marine": 4200000,
    "Property": 3750000,
    "Casualty": 2100000
  }
}
```

---

### `GET /policies/:id`

Returns a single policy record. `404` if not found.

**Response:** `Policy` object (see `src/app/features/policy-dashboard/models/policy.model.ts`)

---

### `PATCH /policies/:id`

Updates policy fields in-memory. Changes are **not** persisted to `db.json` — restart the API to reset.

**Request body:** Partial `Policy` — send only the fields to change. `flaggedForReview: true` is the primary use case.

**Response:** Updated `Policy` object. `404` if not found.

---

## Policy Model

```typescript
interface Policy {
  id:                string;         // UUID
  policyNumber:      string;         // e.g. 'POL-000042'
  policyHolderName:  string;
  lineOfBusiness:    LineOfBusiness; // 'Marine' | 'Property' | 'Casualty' | 'Aviation' | ...
  status:            PolicyStatus;   // 'Active' | 'Pending' | 'Expired' | 'Cancelled'
  premiumAmount:     number;         // SGD equivalent; 1 000 – 5 000 000
  currency:          Currency;       // 'SGD' | 'JPY' | 'AUD' | 'USD' | 'HKD' | 'MYR' | 'INR' | 'TWD'
  effectiveDate:     string;         // ISO date string 'YYYY-MM-DD'
  expiryDate:        string;         // ISO date string 'YYYY-MM-DD'
  region:            Region;         // 'Singapore' | 'Japan' | 'Australia' | 'India' | ...
  underwriter:       string;
  flaggedForReview:  boolean;
}
```

---

## Test Coverage

| Metric | Coverage |
|---|---|
| Statements | 94.88% |
| **Branches** | **86.46%** |
| Functions | 92.30% |
| Lines | 96.80% |

Run with coverage report:
```bash
ng test --no-watch --code-coverage
# HTML report: coverage/policy-dashboard/index.html
```

---

## Supporting Documentation

| Document | Contents |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Layer diagram, signal store map, HTTP data flow, component hierarchy |
| [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) | Numbered DD-### entries: rationale for every significant technical choice |
| [TRADE_OFFS.md](./TRADE_OFFS.md) | What was deferred (E2E, MFE, i18n, virtual scroll) and why; tech debt register |
| [AI-JOURNAL.md](./AI-JOURNAL.md) | Per-phase record of AI-accepted, AI-challenged, and AI-overridden decisions |
