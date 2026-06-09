export type PolicyStatus = 'Active' | 'Expired' | 'Pending' | 'Cancelled';
export type LineOfBusiness = 'Property' | 'Casualty' | 'A&H' | 'Marine';
export type Region =
  | 'Singapore'
  | 'Hong Kong'
  | 'Australia'
  | 'Japan'
  | 'Thailand'
  | 'Indonesia'
  | 'Malaysia'
  | 'Philippines';
export type Currency = 'USD' | 'SGD' | 'HKD' | 'AUD' | 'JPY' | 'THB';

export interface Policy {
  id: string;
  policyNumber: string;
  policyHolderName: string;
  lineOfBusiness: LineOfBusiness;
  status: PolicyStatus;
  premiumAmount: number;
  currency: Currency;
  effectiveDate: string;
  expiryDate: string;
  region: Region;
  underwriter: string;
  flaggedForReview: boolean;
}
