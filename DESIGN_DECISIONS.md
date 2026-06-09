# Design Decisions

## Zoneless Angular
Chosen over zone.js for explicit, predictable change detection. Requires all async to be signal- or async-pipe-driven.

## Signal Store over NgRx
NgRx adds boilerplate and a learning curve for a single-feature dashboard. Signals are Angular-native, type-safe, and compose well with `computed()` and `effect()`.

## Server-Side Filtering & Pagination
The brief explicitly requires server-side ops. Avoids loading full datasets into the browser; scales to production volumes.

## Skeleton Screens over Spinners
Better perceived performance. Each loading state has a matching skeleton component that mirrors the real layout.

## Angular Material 3 (Local Icons)
Material Icons served from `node_modules/material-icons` — no external CDN dependency, works offline and in air-gapped environments.

## Standalone Components Only
No NgModules. Imports are explicit at the component level — better tree-shaking and easier to reason about dependencies.
