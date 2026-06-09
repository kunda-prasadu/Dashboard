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
