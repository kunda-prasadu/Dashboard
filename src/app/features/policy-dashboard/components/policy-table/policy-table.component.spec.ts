import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

import { PolicyTableComponent } from './policy-table.component';
import { PolicyStore } from '../../store/policy.store';
import { Policy } from '../../models/policy.model';
import { EMPTY_SUMMARY } from '../../models/policy-summary.model';

const makePolicy = (overrides: Partial<Policy> = {}): Policy => ({
  id: 'p1', policyNumber: 'POL-000001', policyHolderName: 'Wei Wong',
  lineOfBusiness: 'Property', status: 'Active', premiumAmount: 1_250_000,
  currency: 'SGD', effectiveDate: '2025-01-01', expiryDate: '2026-01-01',
  region: 'Singapore', underwriter: 'Lee Chan', flaggedForReview: false,
  ...overrides
});

/** Minimal PolicyStore stub — only the signals this component reads. */
function makeStoreSpy() {
  const selectedIds = signal<Set<string>>(new Set());
  return {
    policies:    signal<Policy[]>([makePolicy(), makePolicy({ id: 'p2', policyNumber: 'POL-000002' })]),
    total:       signal(2),
    pagination:  signal({ pageIndex: 0, pageSize: 25 }),
    sort:        signal({ field: 'expiryDate', order: 'asc' as const }),
    loading:     signal(false),
    error:       signal<string | null>(null),
    summary:     signal(EMPTY_SUMMARY),
    selectedIds,
    selectedCount: signal(0),
    hasSelection:  signal(false),
    updateSort:    jasmine.createSpy('updateSort'),
    setPage:       jasmine.createSpy('setPage'),
    toggleSelection: jasmine.createSpy('toggleSelection'),
    selectAll:     jasmine.createSpy('selectAll'),
    clearSelection: jasmine.createSpy('clearSelection'),
  };
}

describe('PolicyTableComponent', () => {
  let fixture: ComponentFixture<PolicyTableComponent>;
  let component: PolicyTableComponent;
  let storeSpy: ReturnType<typeof makeStoreSpy>;

  beforeEach(async () => {
    storeSpy = makeStoreSpy();

    await TestBed.configureTestingModule({
      imports: [PolicyTableComponent, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PolicyStore, useValue: storeSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('formatPremium()', () => {
    it('formats exact millions with M suffix', () => {
      // 2,000,000 / 1M = 2.0 — unambiguous, no rounding edge case
      const result = component.formatPremium(2_000_000, 'USD');
      expect(result).toContain('2.0M');
      expect(result).toContain('$');
    });

    it('formats thousands with K suffix', () => {
      // 500,000 / 1K = 500 — clean integer, no rounding
      const result = component.formatPremium(500_000, 'USD');
      expect(result).toContain('500K');
    });

    it('formats sub-thousand with full number', () => {
      // 800 < 1000 — hits the full-number branch
      const result = component.formatPremium(800, 'USD');
      expect(result).toContain('800');
      expect(result).not.toContain('K');
      expect(result).not.toContain('M');
    });

    it('uses correct currency symbol for JPY', () => {
      expect(component.formatPremium(2_000_000, 'JPY')).toContain('¥');
    });
  });

  describe('dataSource sync', () => {
    it('renders a row for each policy in the store', () => {
      const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]') as NodeList;
      expect(rows.length).toBe(2);
    });

    it('shows policy number in the table', () => {
      const cell = fixture.nativeElement.querySelector('td.mat-column-policyNumber') as HTMLElement;
      expect(cell?.textContent?.trim()).toBe('POL-000001');
    });
  });

  describe('select-all (toggleSelectAll)', () => {
    it('calls selectAll when nothing is selected', () => {
      component.onToggleSelectAll();
      expect(storeSpy.selectAll).toHaveBeenCalled();
    });

    it('calls clearSelection when all page policies are selected', () => {
      // Mark all ids as selected
      storeSpy.selectedIds.set(new Set(['p1', 'p2']));
      fixture.detectChanges();
      component.onToggleSelectAll();
      expect(storeSpy.clearSelection).toHaveBeenCalled();
    });

    it('header checkbox is indeterminate when only some rows are selected', () => {
      storeSpy.selectedIds.set(new Set(['p1']));
      fixture.detectChanges();
      expect(component.someSelected()).toBeTrue();
      expect(component.allSelected()).toBeFalse();
    });

    it('allSelected() is false when the policy list is empty', () => {
      // Hits the `ids.length > 0 &&` short-circuit false branch
      storeSpy.policies.set([]);
      fixture.detectChanges();
      expect(component.allSelected()).toBeFalse();
    });
  });

  describe('server-side sort', () => {
    it('delegates sort change to store.updateSort()', () => {
      component.onSortChange({ active: 'premiumAmount', direction: 'desc' });
      expect(storeSpy.updateSort).toHaveBeenCalledWith('premiumAmount', 'desc');
    });

    it('falls back to expiryDate asc when sort is cleared', () => {
      component.onSortChange({ active: '', direction: '' });
      expect(storeSpy.updateSort).toHaveBeenCalledWith('expiryDate', 'asc');
    });
  });

  describe('pagination', () => {
    it('delegates page event to store.setPage()', () => {
      component.onPage({ pageIndex: 1, pageSize: 50, length: 250 });
      expect(storeSpy.setPage).toHaveBeenCalledWith(1, 50);
    });
  });

  describe('rowClick output', () => {
    it('emits the policy id on view-details click', () => {
      let emittedId: string | undefined;
      component.rowClick.subscribe((id: string) => { emittedId = id; });
      component.onViewDetails('p1');
      expect(emittedId).toBe('p1');
    });
  });
});
