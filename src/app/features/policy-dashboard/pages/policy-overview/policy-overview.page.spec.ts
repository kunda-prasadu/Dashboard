import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { PolicyOverviewPage } from './policy-overview.page';
import { PolicyStore } from '../../store/policy.store';
import { PolicySummaryData, EMPTY_SUMMARY } from '../../models/policy-summary.model';
import { Policy } from '../../models/policy.model';
import { StatusDrilldownDialogComponent } from '../../components/status-drilldown-dialog/status-drilldown-dialog.component';

const MOCK_POLICY: Policy = {
  id: 'p1', policyNumber: 'POL-000001', policyHolderName: 'Wei Wong',
  lineOfBusiness: 'Property', status: 'Active', premiumAmount: 50000,
  currency: 'SGD', effectiveDate: '2025-01-01', expiryDate: '2026-12-31',
  region: 'Singapore', underwriter: 'Lee Chan', flaggedForReview: false
};

function makeStoreSpy(overrides: Partial<PolicySummaryData> = {}) {
  const summary: PolicySummaryData = {
    ...EMPTY_SUMMARY, active: 10, pending: 5, expired: 3, cancelled: 2, ...overrides
  };
  return {
    loadPolicies:  jasmine.createSpy('loadPolicies'),
    updateFilters: jasmine.createSpy('updateFilters'),
    clearFilters:  jasmine.createSpy('clearFilters'),
    policies:      signal([MOCK_POLICY]),
    total:         signal(1),
    loading:       signal(false),
    error:         signal<string | null>(null),
    hasSelection:  signal(false),
    summary:       signal(summary),
    filters:       signal({}),
    pagination:    signal({ pageIndex: 0, pageSize: 10 }),
    sort:          signal({ field: 'expiryDate', order: 'asc' })
  };
}

describe('PolicyOverviewPage', () => {
  let fixture: ComponentFixture<PolicyOverviewPage>;
  let component: PolicyOverviewPage;
  let storeSpy: ReturnType<typeof makeStoreSpy>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  async function setup(summaryOverrides: Partial<PolicySummaryData> = {}) {
    storeSpy  = makeStoreSpy(summaryOverrides);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    dialogSpy.open.and.returnValue({ afterClosed: () => of(undefined) } as any);

    TestBed.configureTestingModule({
      imports: [PolicyOverviewPage, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PolicyStore, useValue: storeSpy }
      ]
    });
    // overrideProvider applies after configureTestingModule and takes precedence
    // over providers coming from the standalone component's own imports (MatDialogModule)
    TestBed.overrideProvider(MatDialog, { useValue: dialogSpy });
    await TestBed.compileComponents();

    fixture   = TestBed.createComponent(PolicyOverviewPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('calls store.loadPolicies() on init', async () => {
    await setup();
    expect(storeSpy.loadPolicies).toHaveBeenCalled();
  });

  describe('onStatusDrilldown()', () => {
    it('opens StatusDrilldownDialogComponent for Active status', async () => {
      await setup({ active: 15 });
      component.onStatusDrilldown('Active');
      expect(dialogSpy.open).toHaveBeenCalledWith(
        StatusDrilldownDialogComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            title:  'Active Policies',
            count:  15,
            filter: { statuses: ['Active'] }
          })
        })
      );
    });

    it('opens dialog for Pending status with correct count', async () => {
      await setup({ pending: 7 });
      component.onStatusDrilldown('Pending');
      expect(dialogSpy.open).toHaveBeenCalledWith(
        StatusDrilldownDialogComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({ count: 7, filter: { statuses: ['Pending'] } })
        })
      );
    });

    it('opens dialog for Expired status with correct accent color', async () => {
      await setup();
      component.onStatusDrilldown('Expired');
      expect(dialogSpy.open).toHaveBeenCalledWith(
        StatusDrilldownDialogComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({ accentColor: '#E53935' })
        })
      );
    });

    it('opens dialog for Cancelled status with grey accent', async () => {
      await setup();
      component.onStatusDrilldown('Cancelled');
      expect(dialogSpy.open).toHaveBeenCalledWith(
        StatusDrilldownDialogComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({ accentColor: '#757575' })
        })
      );
    });
  });

  describe('onExpiryDrilldown()', () => {
    it('opens StatusDrilldownDialogComponent with expiry filter', async () => {
      await setup({ expiringWithin30Days: 8 });
      component.onExpiryDrilldown();
      expect(dialogSpy.open).toHaveBeenCalledWith(
        StatusDrilldownDialogComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            title: 'Expiring in 30 Days',
            count: 8,
            filter: jasmine.objectContaining({ statuses: ['Active'] })
          })
        })
      );
    });

    it('sets expiryDateFrom to today', async () => {
      await setup();
      const today = new Date().toISOString().split('T')[0];
      component.onExpiryDrilldown();
      expect(dialogSpy.open).toHaveBeenCalledWith(
        StatusDrilldownDialogComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            filter: jasmine.objectContaining({ expiryDateFrom: today })
          })
        })
      );
    });
  });

  describe('onClearFilters()', () => {
    it('delegates to store.clearFilters()', async () => {
      await setup();
      component.onClearFilters();
      expect(storeSpy.clearFilters).toHaveBeenCalled();
    });
  });

  describe('onRowClick()', () => {
    it('opens a dialog when a matching policy is found', async () => {
      await setup();
      component.onRowClick('p1');
      expect(dialogSpy.open).toHaveBeenCalled();
    });

    it('does not open a dialog when policy id is not found', async () => {
      await setup();
      component.onRowClick('unknown-id');
      expect(dialogSpy.open).not.toHaveBeenCalled();
    });
  });
});
