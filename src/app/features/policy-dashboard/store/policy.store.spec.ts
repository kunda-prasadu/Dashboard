import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';
import { PolicyStore } from './policy.store';
import { PolicyApiService } from '../services/policy-api.service';
import { Policy } from '../models/policy.model';
import { PolicySummaryData } from '../models/policy-summary.model';
import { NormalisedHttpError } from '../../../core/interceptors/error.interceptor';
import { HttpErrorResponse } from '@angular/common/http';

const makePolicy = (overrides: Partial<Policy> = {}): Policy => ({
  id: 'p1', policyNumber: 'POL-000001', policyHolderName: 'Wei Wong',
  lineOfBusiness: 'Property', status: 'Active', premiumAmount: 50000,
  currency: 'SGD', effectiveDate: '2025-01-01', expiryDate: '2026-12-31',
  region: 'Singapore', underwriter: 'Lee Chan', flaggedForReview: false,
  ...overrides
});

const makeSummary = (overrides: Partial<PolicySummaryData> = {}): PolicySummaryData => ({
  active: 1, pending: 0, expired: 0, cancelled: 0,
  totalPremium: 50000, expiringWithin30Days: 0, gwpByLob: {},
  ...overrides
});

const makeError = (status = 500): NormalisedHttpError => ({
  status,
  message: 'A server error occurred. Please try again later.',
  originalError: new HttpErrorResponse({ status })
});

describe('PolicyStore', () => {
  let store: PolicyStore;
  let apiSpy: jasmine.SpyObj<PolicyApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj<PolicyApiService>('PolicyApiService', [
      'getAll', 'getSummary', 'patch', 'flagPolicies'
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        PolicyStore,
        { provide: PolicyApiService, useValue: apiSpy }
      ]
    });

    store = TestBed.inject(PolicyStore);
  });

  describe('loadPolicies()', () => {
    it('sets policies, total, and summary on success', () => {
      const policy = makePolicy();
      const summary = makeSummary();
      apiSpy.getAll.and.returnValue(of({ data: [policy], total: 1 }));
      apiSpy.getSummary.and.returnValue(of(summary));

      store.loadPolicies();

      expect(store.policies()).toEqual([policy]);
      expect(store.total()).toBe(1);
      expect(store.summary()).toEqual(summary);
      expect(store.loading()).toBeFalse();
      expect(store.error()).toBeNull();
    });

    it('delegates filters + sort + pagination to the API', () => {
      apiSpy.getAll.and.returnValue(of({ data: [], total: 0 }));
      apiSpy.getSummary.and.returnValue(of(makeSummary()));

      store.updateFilters({ statuses: ['Active'] });

      const [filters, sort, page] = apiSpy.getAll.calls.mostRecent().args;
      expect(filters?.statuses).toEqual(['Active']);
      expect(sort?.field).toBe('expiryDate');
      expect(page?.pageIndex).toBe(0);
    });

    it('sets error and clears loading on failure', () => {
      apiSpy.getAll.and.returnValue(throwError(() => makeError(500)));
      apiSpy.getSummary.and.returnValue(of(makeSummary()));

      store.loadPolicies();

      expect(store.error()).toBeTruthy();
      expect(store.loading()).toBeFalse();
    });

    it('resets to page 0 when filters change', () => {
      apiSpy.getAll.and.returnValue(of({ data: [], total: 0 }));
      apiSpy.getSummary.and.returnValue(of(makeSummary()));

      store.setPage(3, 25);
      store.updateFilters({ search: 'test' });

      const [,, page] = apiSpy.getAll.calls.mostRecent().args;
      expect(page?.pageIndex).toBe(0);
    });

    it('resets to page 0 when sort changes', () => {
      apiSpy.getAll.and.returnValue(of({ data: [], total: 0 }));
      apiSpy.getSummary.and.returnValue(of(makeSummary()));

      store.updateSort('premiumAmount', 'desc');

      const [,sort, page] = apiSpy.getAll.calls.mostRecent().args;
      expect(sort?.field).toBe('premiumAmount');
      expect(page?.pageIndex).toBe(0);
    });
  });

  describe('selection', () => {
    beforeEach(() => {
      apiSpy.getAll.and.returnValue(of({ data: [makePolicy({ id: 'p1' }), makePolicy({ id: 'p2' })], total: 2 }));
      apiSpy.getSummary.and.returnValue(of(makeSummary()));
      store.loadPolicies();
    });

    it('toggleSelection adds and removes ids', () => {
      store.toggleSelection('p1');
      expect(store.selectedIds().has('p1')).toBeTrue();
      expect(store.selectedCount()).toBe(1);

      store.toggleSelection('p1');
      expect(store.selectedIds().has('p1')).toBeFalse();
    });

    it('selectAll selects all current page policies', () => {
      store.selectAll();
      expect(store.selectedCount()).toBe(2);
      expect(store.hasSelection()).toBeTrue();
    });

    it('clearSelection empties selection', () => {
      store.selectAll();
      store.clearSelection();
      expect(store.selectedCount()).toBe(0);
      expect(store.hasSelection()).toBeFalse();
    });
  });

  describe('flagSelectedPolicies()', () => {
    const p1 = makePolicy({ id: 'p1', flaggedForReview: false });
    const p2 = makePolicy({ id: 'p2', flaggedForReview: false });

    beforeEach(() => {
      apiSpy.getAll.and.returnValue(of({ data: [p1, p2], total: 2 }));
      apiSpy.getSummary.and.returnValue(of(makeSummary()));
      store.loadPolicies();
      store.toggleSelection('p1');
    });

    it('applies optimistic flag and confirms on success', () => {
      apiSpy.flagPolicies.and.returnValue(of([{ ...p1, flaggedForReview: true }]));

      store.flagSelectedPolicies().subscribe();

      expect(store.policies().find(p => p.id === 'p1')?.flaggedForReview).toBeTrue();
      expect(store.selectedCount()).toBe(0);
    });

    it('rolls back optimistic update on error', () => {
      apiSpy.flagPolicies.and.returnValue(throwError(() => makeError(500)));

      store.flagSelectedPolicies().subscribe({ error: () => {} });

      expect(store.policies().find(p => p.id === 'p1')?.flaggedForReview).toBeFalse();
      expect(store.lastFailedFlagIds()).toEqual(['p1']);
      expect(store.error()).toBeTruthy();
    });
  });

  describe('renewPolicy()', () => {
    const original = makePolicy({ id: 'p1', status: 'Expired' });

    beforeEach(() => {
      apiSpy.getAll.and.returnValue(of({ data: [original], total: 1 }));
      apiSpy.getSummary.and.returnValue(of(makeSummary()));
      store.loadPolicies();
    });

    it('applies optimistic Active status and refreshes summary on success', () => {
      apiSpy.patch.and.returnValue(of({ ...original, status: 'Active' }));
      apiSpy.getSummary.and.returnValue(of(makeSummary({ active: 2 })));

      store.renewPolicy('p1');

      expect(store.policies().find(p => p.id === 'p1')?.status).toBe('Active');
    });

    it('rolls back status on error', () => {
      apiSpy.patch.and.returnValue(throwError(() => makeError(500)));

      store.renewPolicy('p1');

      expect(store.policies().find(p => p.id === 'p1')?.status).toBe('Expired');
      expect(store.error()).toBeTruthy();
    });
  });
});
