# Architecture

## Overview
Chubb APAC Policy Overview Dashboard — Angular 20, standalone + zoneless + signals.

## Layers
- **core/services** — singleton HTTP services (PolicyService, etc.)
- **core/interceptors** — HTTP interceptors (error, auth)
- **shared** — reusable presentational components and pipes
- **features/policy-dashboard** — all domain-specific code:
  - `models/` — TypeScript interfaces (Policy, PagedResponse, FilterParams)
  - `constants/` — enums and lookup maps (region, status, LOB)
  - `services/` — feature-scoped services
  - `store/` — signal-based state store
  - `components/` — smart and presentational components
  - `pages/` — routed page components

## State Management
Custom signal store (`PolicyStore`) — no NgRx, no BehaviorSubject. All state is `signal<T>()`, computed values use `computed()`, side-effects use `effect()`.

## Change Detection
`provideZonelessChangeDetection()` — zone.js is NOT in polyfills. All components use `ChangeDetectionStrategy.OnPush`.

## Data Flow
UI → Store (dispatch action-like method) → Service (HTTP) → Server-side filter/paginate → Store (update signal) → UI (reacts via computed)

## API
Custom Express mock server (`mock-api/`). Server handles filtering, sorting, and pagination — no client-side data manipulation.
