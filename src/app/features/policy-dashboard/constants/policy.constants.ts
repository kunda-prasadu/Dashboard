/**
 * Policy domain constants.
 *
 * What: Single source of truth for all domain lookup values used in filters,
 * dropdowns, and chip lists across the dashboard.
 *
 * Why `as const` + typed arrays: Gives both compile-time exhaustiveness checks
 * (TypeScript narrows the element type) and runtime iteration (for rendering
 * filter chips). Using `readonly` arrays prevents accidental mutation.
 *
 * STORAGE_KEYS: Namespaced localStorage keys to avoid collisions with other apps
 * on the same origin. All prefixed with 'policy-hub:'.
 */
import type { Currency, LineOfBusiness, PolicyStatus, Region } from '../models/policy.model';

export const POLICY_STATUSES: readonly PolicyStatus[] = [
  'Active', 'Expired', 'Pending', 'Cancelled'
] as const;

export const REGIONS: readonly Region[] = [
  'Singapore', 'Hong Kong', 'Australia', 'Japan',
  'Thailand', 'Indonesia', 'Malaysia', 'Philippines'
] as const;

export const LINES_OF_BUSINESS: readonly LineOfBusiness[] = [
  'Property', 'Casualty', 'A&H', 'Marine'
] as const;

export const CURRENCIES: readonly Currency[] = [
  'USD', 'SGD', 'HKD', 'AUD', 'JPY', 'THB'
] as const;

export const PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50, 100] as const;

export const STORAGE_KEYS = {
  THEME:   'policy-hub:theme',
  PALETTE: 'policy-hub:palette',
  PAGE_SIZE: 'policy-hub:page-size',
  FILTERS: 'policy-hub:filters'
} as const;
