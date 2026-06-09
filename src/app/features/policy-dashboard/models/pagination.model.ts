export interface PageRequest {
  pageIndex: number;
  pageSize: number;
}

export interface PolicyPage<T> {
  data: T[];
  total: number;
}
