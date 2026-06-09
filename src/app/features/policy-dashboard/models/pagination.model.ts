/**
 * Pagination models.
 *
 * PageRequest: What the store sends to the API (0-based pageIndex matching
 * Angular Material's MatPaginator convention; server converts to 1-based).
 *
 * PolicyPage<T>: The envelope the API returns — one page of data plus the
 * total record count needed to render the paginator correctly.
 */
export interface PageRequest {
  pageIndex: number;
  pageSize: number;
}

export interface PolicyPage<T> {
  data: T[];
  total: number;
}
