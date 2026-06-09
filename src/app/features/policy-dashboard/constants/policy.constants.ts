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
  THEME: 'policy-hub:theme',
  PAGE_SIZE: 'policy-hub:page-size',
  FILTERS: 'policy-hub:filters'
} as const;
