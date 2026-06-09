/**
 * Core domain models for the Policy feature.
 *
 * Why string unions instead of enums:
 * - Zero runtime overhead — unions are erased at compile time; enums compile to objects.
 * - Tree-shakeable — unused members are eliminated by the bundler.
 * - Self-documenting in templates and switch statements without an import.
 * - Compatible with the API response shapes directly (no mapping layer needed).
 */
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
