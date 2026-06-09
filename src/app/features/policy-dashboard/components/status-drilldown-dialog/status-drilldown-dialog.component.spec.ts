import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { StatusDrilldownDialogComponent } from './status-drilldown-dialog.component';
import { PolicyApiService } from '../../services/policy-api.service';
import { Policy } from '../../models/policy.model';

const MOCK_POLICY: Policy = {
  id: 'p1', policyNumber: 'POL-000001', policyHolderName: 'Wei Wong',
  lineOfBusiness: 'Property', status: 'Active', premiumAmount: 1_500_000,
  currency: 'SGD', effectiveDate: '2025-01-01', expiryDate: '2026-12-31',
  region: 'Singapore', underwriter: 'Lee Chan', flaggedForReview: false
};

const ACTIVE_DATA = {
  title: 'Active Policies', subtitle: 'Showing all active policies',
  accentColor: '#43A047', count: 42, filter: { statuses: ['Active'] as const }
};

describe('StatusDrilldownDialogComponent', () => {
  let fixture: ComponentFixture<StatusDrilldownDialogComponent>;
  let component: StatusDrilldownDialogComponent;
  let apiSpy: jasmine.SpyObj<PolicyApiService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<StatusDrilldownDialogComponent>>;

  async function setup(
    data = ACTIVE_DATA,
    apiResult: Policy[] | 'error' = [MOCK_POLICY]
  ) {
    apiSpy = jasmine.createSpyObj('PolicyApiService', ['getAll']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    if (apiResult === 'error') {
      apiSpy.getAll.and.returnValue(throwError(() => new Error('API Error')));
    } else {
      apiSpy.getAll.and.returnValue(of({ data: apiResult, total: apiResult.length }));
    }

    await TestBed.configureTestingModule({
      imports: [StatusDrilldownDialogComponent, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef,    useValue: dialogRefSpy },
        { provide: PolicyApiService, useValue: apiSpy }
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(StatusDrilldownDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('calls getAll with the provided filter on init', async () => {
    await setup();
    expect(apiSpy.getAll).toHaveBeenCalledWith(
      { statuses: ['Active'] },
      jasmine.any(Object),
      jasmine.any(Object)
    );
  });

  it('populates policies signal on successful load', async () => {
    await setup();
    expect(component.policies().length).toBe(1);
    expect(component.policies()[0].policyNumber).toBe('POL-000001');
  });

  it('sets loading to false after successful load', async () => {
    await setup();
    expect(component.loading()).toBeFalse();
  });

  it('sets error signal and loading=false on API failure', async () => {
    await setup(ACTIVE_DATA, 'error');
    expect(component.error()).toBeTruthy();
    expect(component.loading()).toBeFalse();
  });

  it('close() calls dialogRef.close()', async () => {
    await setup();
    component.close();
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });

  describe('formatPremium()', () => {
    it('formats millions with one decimal place', async () => {
      await setup();
      expect(component.formatPremium(1_500_000, 'SGD')).toBe('SGD 1.5M');
    });

    it('formats thousands with no decimal place', async () => {
      await setup();
      expect(component.formatPremium(50_000, 'USD')).toBe('USD 50K');
    });

    it('returns raw value for amounts below 1000', async () => {
      await setup();
      expect(component.formatPremium(500, 'HKD')).toBe('HKD 500');
    });
  });

  describe('lobClass()', () => {
    it('returns lob-badge class with sanitised lob name', async () => {
      await setup();
      expect(component.lobClass('Property')).toBe('lob-badge lob-property');
      expect(component.lobClass('A&H')).toBe('lob-badge lob-ah');
      expect(component.lobClass('Marine')).toBe('lob-badge lob-marine');
    });
  });

  it('shows empty state when API returns zero records', async () => {
    await setup(ACTIVE_DATA, []);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No policies found');
  });
});
