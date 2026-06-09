# AI Journal

Record of AI interactions — accepted, challenged, or overridden decisions.

---

## Phase 0 — Scaffold & Guardrails

**Accepted:** Angular 20 scaffold with `--ssr true --routing true --style scss --skip-git`. Angular Material added via `ng add`.

**Overrode:** AI default includes zone.js in polyfills and CDN Material Icons link in index.html.
- Removed zone.js from `polyfills` in angular.json (zoneless requirement).
- Removed CDN `<link>` for Material Icons; added `material-icons` npm package to styles array instead.

**Why:** Brief explicitly requires `provideZonelessChangeDetection()` and local icon serving — CDN links are a dependency risk and violate the offline-readiness requirement.
