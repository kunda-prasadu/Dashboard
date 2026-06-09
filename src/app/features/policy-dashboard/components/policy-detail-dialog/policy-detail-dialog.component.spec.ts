import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PolicyDetailDialogComponent } from './policy-detail-dialog.component';
import { Policy } from '../../models/policy.model';

const MOCK_POLICY: Policy = {
  id: 'p1', policyNumber: 'POL-000001', policyHolderName: 'Wei Wong',
  lineOfBusiness: 'Property', status: 'Active', premiumAmount: 50000,
  currency: 'SGD', effectiveDate: '2025-01-01', expiryDate: '2026-12-31',
  region: 'Singapore', underwriter: 'Lee Chan', flaggedForReview: false
};

describe('PolicyDetailDialogComponent', () => {
  let fixture: ComponentFixture<PolicyDetailDialogComponent>;
  let component: PolicyDetailDialogComponent;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<PolicyDetailDialogComponent>>;

  async function setup(policy: Policy = MOCK_POLICY) {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [PolicyDetailDialogComponent, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: { policy } },
        { provide: MatDialogRef,    useValue: dialogRefSpy }
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(PolicyDetailDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('exposes the injected policy via the policy getter', async () => {
    await setup();
    expect((component as any).policy).toBe(MOCK_POLICY);
  });

  it('close() calls dialogRef.close()', async () => {
    await setup();
    component.close();
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });

  it('statusColorMap has entries for all four statuses', async () => {
    await setup();
    const map = (component as any).statusColorMap;
    expect(map['Active']).toBeTruthy();
    expect(map['Expired']).toBeTruthy();
    expect(map['Pending']).toBeTruthy();
    expect(map['Cancelled']).toBeTruthy();
  });

  it('renders policy number in the template', async () => {
    await setup();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('POL-000001');
  });

  it('renders policyholder name in the template', async () => {
    await setup();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Wei Wong');
  });

  it('renders line of business', async () => {
    await setup();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Property');
  });

  it('renders region', async () => {
    await setup();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Singapore');
  });
});
