# Chubb APAC Policy Overview Dashboard

A production-quality insurance policy management dashboard built with **Angular 20**, **Angular Material 3**, and a custom **signal-based state store**. Designed for Chubb APAC operations to provide real-time visibility into policy portfolios across regions and lines of business.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 20 — standalone components, zoneless, signals |
| UI Library | Angular Material 3 (local icons, no CDN) |
| State | Custom signal store (`PolicyStore`) — no NgRx |
| HTTP | `HttpClient` with functional interceptors (`withFetch`) |
| Mock API | Custom Express ESM server (server-side filter/sort/paginate) |
| Tests | Jasmine + Karma (100 specs, all green) |
| Styles | SCSS + Material Design tokens |

---

## Getting Started

### Prerequisites
- Node.js `>=24.0.0`
- npm `>=11`

### Install
```bash
npm install
```

### Generate mock data (required before starting API)
```bash
npm run generate:mock
```

### Run mock API (port 3000)
```bash
npm run start:api
```

### Run Angular dev server (port 4200)
```bash
npm start
```

### Build
```bash
ng build
```

### Run tests
```bash
ng test
```

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
src/app/
├── core/
│   ├── services/              # Singleton services (LoggerService)
│   └── interceptors/          # Functional HTTP interceptors (error)
├── shared/                    # Reusable presentational components & pipes
└── features/
    └── policy-dashboard/
        ├── models/            # TypeScript interfaces (string unions, no enums)
        ├── constants/         # Domain constants — statuses, regions, LOB, currencies
        ├── services/          # PolicyApiService — HTTP, no state
        ├── store/             # PolicyStore — signal-based, single source of truth
        ├── components/
        │   ├── policy-table/    # Presentational table — server sort, controlled paginator, selection
        │   ├── policy-filter/   # Reactive filter bar — dual subs, URL+localStorage sync, chips
        │   ├── summary-panel/   # KPI panel — status cards, GWP bars, SVG expiry arc
        │   └── bulk-action-bar/ # Contextual toolbar — bulk flag-for-review, retry, clear selection
        └── pages/
            └── policy-overview/ # Routed shell — composes filter + table, bootstraps store

mock-api/
├── generate-data.js      # Generates 250 APAC policy records → db.json
└── server.js             # Express mock API — filter, sort, paginate, summarise
```

---

## Key Architectural Decisions

- **Zoneless Angular**: `provideZonelessChangeDetection()` — no zone.js in app polyfills. Explicit, predictable rendering.
- **Signal store over NgRx**: Single feature, ~¼ the boilerplate, native Angular, zero extra deps.
- **Server-side filtering**: All filter/sort/paginate logic lives in the Express server. The browser holds one page of data at a time.
- **String unions over enums**: `type PolicyStatus = 'Active' | 'Expired' | ...` — tree-shakeable, no runtime overhead.
- **Functional HTTP interceptors**: Stateless, composable, testable without class instantiation.
- **CSS custom property tokens**: Light/dark theme via a single `html.dark-theme` class toggle — no rebuild, no JS loop.
- **StorageService as sole localStorage gateway**: SSR-safe, quota-safe; enforced by grep.

See [ARCHITECTURE.md](./ARCHITECTURE.md), [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md), and [TRADE_OFFS.md](./TRADE_OFFS.md) for full detail.

---

## API Reference

| Endpoint | Description |
|---|---|
| `GET /policies` | Filtered + sorted + paginated list → `{data, total}` |
| `GET /policies/summary` | Aggregate stats over same filters |
| `GET /policies/:id` | Single policy record |
| `PATCH /policies/:id` | In-memory update (does not persist to db.json) |

### Filter Parameters (`/policies` + `/policies/summary`)
`search`, `status[]`, `region[]`, `lineOfBusiness[]`, `currency[]`, `flaggedForReview`, `premiumMin`, `premiumMax`, `effectiveDateFrom`, `effectiveDateTo`, `expiryDateFrom`, `expiryDateTo`, `sort`, `order`, `page`, `pageSize`

---

## AI Journal

All AI-assisted decisions — accepted, challenged, and overridden — are tracked in [AI-JOURNAL.md](./AI-JOURNAL.md).
