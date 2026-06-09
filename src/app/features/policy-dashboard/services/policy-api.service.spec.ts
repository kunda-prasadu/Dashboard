import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { PolicyApiService } from './policy-api.service';
import { Policy } from '../models/policy.model';
import { PolicyPage } from '../models/pagination.model';
import { PolicySummaryData } from '../models/policy-summary.model';

const API = 'http://localhost:3000';

const mockPolicy: Policy = {
  id: 'abc-123',
  policyNumber: 'POL-000001',
  policyHolderName: 'Wei Wong',
  lineOfBusiness: 'Property',
  status: 'Active',
  premiumAmount: 50000,
  currency: 'SGD',
  effectiveDate: '2025-01-01',
  expiryDate: '2026-01-01',
  region: 'Singapore',
  underwriter: 'Lee Chan',
  flaggedForReview: false
};

const mockPage: PolicyPage<Policy> = { data: [mockPolicy], total: 1 };

const mockSummary: PolicySummaryData = {
  active: 1, pending: 0, expired: 0, cancelled: 0,
  totalPremium: 50000, expiringWithin30Days: 0, gwpByLob: { Property: 50000 }
};

describe('PolicyApiService', () => {
  let service: PolicyApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PolicyApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll — sends correct filter + sort + pagination params', () => {
    service.getAll(
      { search: 'Wei', statuses: ['Active'], regions: ['Singapore'] },
      { field: 'premiumAmount', order: 'desc' },
      { pageIndex: 0, pageSize: 25 }
    ).subscribe(res => expect(res).toEqual(mockPage));

    const req = httpMock.expectOne(r => r.url === `${API}/policies`);
    expect(req.request.method).toBe('GET');
    const p = req.request.params;
    expect(p.get('search')).toBe('Wei');
    expect(p.getAll('status')).toEqual(['Active']);
    expect(p.getAll('region')).toEqual(['Singapore']);
    expect(p.get('sort')).toBe('premiumAmount');
    expect(p.get('order')).toBe('desc');
    expect(p.get('page')).toBe('1');
    expect(p.get('pageSize')).toBe('25');
    req.flush(mockPage);
  });

  it('getSummary — sends filter params, hits /summary endpoint', () => {
    service.getSummary({ statuses: ['Active', 'Pending'] }).subscribe(res =>
      expect(res).toEqual(mockSummary)
    );

    const req = httpMock.expectOne(r => r.url === `${API}/policies/summary`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.getAll('status')).toEqual(['Active', 'Pending']);
    req.flush(mockSummary);
  });

  it('patch — sends PATCH with correct body', () => {
    service.patch('abc-123', { flaggedForReview: true }).subscribe(res =>
      expect(res.flaggedForReview).toBeTrue()
    );

    const req = httpMock.expectOne(`${API}/policies/abc-123`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ flaggedForReview: true });
    req.flush({ ...mockPolicy, flaggedForReview: true });
  });

  it('flagPolicies — issues one PATCH per id via forkJoin', () => {
    const ids = ['id-1', 'id-2'];
    service.flagPolicies(ids).subscribe(results => expect(results.length).toBe(2));

    ids.forEach(id => {
      const req = httpMock.expectOne(`${API}/policies/${id}`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ ...mockPolicy, id, flaggedForReview: true });
    });
  });
});
