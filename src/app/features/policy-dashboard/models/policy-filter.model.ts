/**
 * PolicyFilter
 *
 * What: Represents all available server-side filter parameters.
 * Every field is optional — an empty object means "no filter applied".
 *
 * Why dates are ISO strings (not Date objects): The API expects ISO YYYY-MM-DD strings.
 * Keeping them as strings avoids serialisation/deserialisation round-trips and
 * timezone ambiguity when converting Date → string for query params.
 */
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
