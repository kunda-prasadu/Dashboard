/**
 * PolicySummaryData
 *
 * What: Aggregated portfolio statistics returned by GET /policies/summary.
 * The summary is computed over the same filter context as the current page,
 * so KPI cards always reflect the filtered view.
 *
 * EMPTY_SUMMARY: Used as the initial signal value before the first API call
 * completes. Prevents NaN/undefined in KPI card templates during loading.
 */
export interface GwpByLob {
  Property?: number;
  Casualty?: number;
  'A&H'?: number;
  Marine?: number;
}

export interface PolicySummaryData {
  active: number;
  pending: number;
  expired: number;
  cancelled: number;
  totalPremium: number;
  expiringWithin30Days: number;
  gwpByLob: GwpByLob;
}

export const EMPTY_SUMMARY: PolicySummaryData = {
  active: 0,
  pending: 0,
  expired: 0,
  cancelled: 0,
  totalPremium: 0,
  expiringWithin30Days: 0,
  gwpByLob: {}
};
