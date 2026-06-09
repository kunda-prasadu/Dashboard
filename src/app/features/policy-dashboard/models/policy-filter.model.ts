import type { Currency, LineOfBusiness, PolicyStatus, Region } from './policy.model';

export interface PolicyFilter {
  search?: string;
  statuses?: PolicyStatus[];
  regions?: Region[];
  linesOfBusiness?: LineOfBusiness[];
  currencies?: Currency[];
  flaggedForReview?: boolean;
  premiumMin?: number;
  premiumMax?: number;
  effectiveDateFrom?: string;
  effectiveDateTo?: string;
  expiryDateFrom?: string;
  expiryDateTo?: string;
}
