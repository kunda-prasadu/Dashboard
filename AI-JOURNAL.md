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
