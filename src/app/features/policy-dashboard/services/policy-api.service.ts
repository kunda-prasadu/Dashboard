import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { Policy } from '../models/policy.model';
import { PolicyFilter } from '../models/policy-filter.model';
import { PageRequest, PolicyPage } from '../models/pagination.model';
import { PolicySummaryData } from '../models/policy-summary.model';

const API_BASE = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class PolicyApiService {
  private readonly http = inject(HttpClient);

  getAll(
    filters?: PolicyFilter,
    sort?: { field: string; order: 'asc' | 'desc' },
    page?: PageRequest
  ): Observable<PolicyPage<Policy>> {
    let params = this.buildFilterParams(filters);

    if (sort) {
      params = params.set('sort', sort.field).set('order', sort.order);
    }
    if (page) {
      params = params
        .set('page', String(page.pageIndex + 1))
        .set('pageSize', String(page.pageSize));
    }

    return this.http.get<PolicyPage<Policy>>(`${API_BASE}/policies`, { params });
  }

  getSummary(filters?: PolicyFilter): Observable<PolicySummaryData> {
    const params = this.buildFilterParams(filters);
    return this.http.get<PolicySummaryData>(`${API_BASE}/policies/summary`, { params });
  }

  getById(id: string): Observable<Policy> {
    return this.http.get<Policy>(`${API_BASE}/policies/${id}`);
  }

  patch(id: string, changes: Partial<Policy>): Observable<Policy> {
    return this.http.patch<Policy>(`${API_BASE}/policies/${id}`, changes);
  }

  flagPolicy(id: string): Observable<Policy> {
    return this.patch(id, { flaggedForReview: true });
  }

  flagPolicies(ids: string[]): Observable<Policy[]> {
    return forkJoin(ids.map(id => this.flagPolicy(id)));
  }

  private buildFilterParams(filters?: PolicyFilter): HttpParams {
    let params = new HttpParams();
    if (!filters) return params;

    if (filters.search)           params = params.set('search', filters.search);
    if (filters.premiumMin != null) params = params.set('premiumMin', String(filters.premiumMin));
    if (filters.premiumMax != null) params = params.set('premiumMax', String(filters.premiumMax));
    if (filters.effectiveDateFrom) params = params.set('effectiveDateFrom', filters.effectiveDateFrom);
    if (filters.effectiveDateTo)   params = params.set('effectiveDateTo', filters.effectiveDateTo);
    if (filters.expiryDateFrom)    params = params.set('expiryDateFrom', filters.expiryDateFrom);
    if (filters.expiryDateTo)      params = params.set('expiryDateTo', filters.expiryDateTo);
    if (filters.flaggedForReview != null) {
      params = params.set('flaggedForReview', String(filters.flaggedForReview));
    }

    filters.statuses?.forEach(s => { params = params.append('status', s); });
    filters.regions?.forEach(r => { params = params.append('region', r); });
    filters.linesOfBusiness?.forEach(l => { params = params.append('lineOfBusiness', l); });
    filters.currencies?.forEach(c => { params = params.append('currency', c); });

    return params;
  }
}
