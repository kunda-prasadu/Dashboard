/**
 * BulkActionBarComponent tests
 *
 * Strategy: provide a minimal stub of PolicyStore (plain functions, not computed signals,
 * to avoid injection-context constraints in specs). Spy on the actual MatSnackBar instance
 * from the fixture injector — this bypasses the standalone-component scoping issue where
 * an early-provided spy may be shadowed by the component's own MatSnackBarModule import.
 *
 * Tests cover:
 *   - success snackbar singular / plural
 *   - failure snackbar with Retry action
 *   - retry calls retryLastFailedFlag and shows success snackbar
 *   - clearSelection delegation
 *   - flag button disabled state
 *   - flagForReview no-op when selectedCount is 0
 */
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject, throwError } from 'rxjs';

import { BulkActionBarComponent } from './bulk-action-bar.component';
import { PolicyStore } from '../../store/policy.store';

// ── Store stub ────────────────────────────────────────────────────────────────

function makeStoreStub(opts: {
  selectedCount?: number;
  hasSelection?: boolean;
  lastFailedFlagIds?: string[];
  flagResult?: 'success' | 'error';
  retryResult?: 'success' | 'error';
}) {
  const count = opts.selectedCount ?? 0;
  const lastFailed = opts.lastFailedFlagIds ?? [];

  return {
    selectedCount:        () => count,
    hasSelection:         () => opts.hasSelection ?? count > 0,
    lastFailedFlagIds:    () => lastFailed,
    clearSelection:       jasmine.createSpy('clearSelection'),
    flagSelectedPolicies: jasmine.createSpy('flagSelectedPolicies').and.returnValue(
      opts.flagResult === 'error'
        ? throwError(() => ({ status: 500, message: 'Server error' }))
        : of([])
    ),
    retryLastFailedFlag: jasmine.createSpy('retryLastFailedFlag').and.returnValue(
      opts.retryResult === 'error'
        ? throwError(() => ({ status: 500, message: 'Server error' }))
        : of([])
    ),
  };
}

// ── Shared setup ──────────────────────────────────────────────────────────────

type StoreStub = ReturnType<typeof makeStoreStub>;

function buildFixture(storeStub: StoreStub): ComponentFixture<BulkActionBarComponent> {
  TestBed.configureTestingModule({
    imports: [BulkActionBarComponent, NoopAnimationsModule],
    providers: [
      provideZonelessChangeDetection(),
      { provide: PolicyStore, useValue: storeStub },
    ],
  });
  const fixture = TestBed.createComponent(BulkActionBarComponent);
  fixture.detectChanges();
  return fixture;
}

// Helper: spy on the actual MatSnackBar instance the component has
function spySnackBar(
  fixture: ComponentFixture<BulkActionBarComponent>,
  onActionStream: ReturnType<typeof of> = of()
): jasmine.Spy {
  const sb = fixture.debugElement.injector.get(MatSnackBar);
  return spyOn(sb, 'open').and.returnValue({
    onAction: () => onActionStream,
    dismiss: () => {},
  } as any);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BulkActionBarComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  // ── success snackbar — singular ──────────────────────────────────────────

  it('shows singular success snackbar when 1 policy is flagged', fakeAsync(() => {
    const store = makeStoreStub({ selectedCount: 1, hasSelection: true });
    const fixture = buildFixture(store);
    const openSpy = spySnackBar(fixture);

    fixture.componentInstance.flagForReview();
    tick();

    expect(store.flagSelectedPolicies).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith(
      '1 policy flagged for review',
      'Dismiss',
      jasmine.objectContaining({ duration: 4000 })
    );
  }));

  // ── success snackbar — plural ────────────────────────────────────────────

  it('shows plural success snackbar when multiple policies are flagged', fakeAsync(() => {
    const store = makeStoreStub({ selectedCount: 5, hasSelection: true });
    const fixture = buildFixture(store);
    const openSpy = spySnackBar(fixture);

    fixture.componentInstance.flagForReview();
    tick();

    expect(openSpy).toHaveBeenCalledWith(
      '5 policies flagged for review',
      'Dismiss',
      jasmine.objectContaining({ duration: 4000 })
    );
  }));

  // ── failure snackbar with Retry ──────────────────────────────────────────

  it('shows failure snackbar with Retry action on HTTP error', fakeAsync(() => {
    const store = makeStoreStub({ selectedCount: 3, hasSelection: true, flagResult: 'error' });
    const fixture = buildFixture(store);
    const openSpy = spySnackBar(fixture); // no action emission — just assert the call

    fixture.componentInstance.flagForReview();
    tick();

    expect(openSpy).toHaveBeenCalledWith(
      'Failed to flag policies. Please try again.',
      'Retry',
      jasmine.objectContaining({ duration: 8000 })
    );
  }));

  // ── Retry triggers retryLastFailedFlag ───────────────────────────────────

  it('calls retryLastFailedFlag and shows success snackbar when Retry is clicked', fakeAsync(() => {
    const retryAction$ = new Subject<void>();
    const store = makeStoreStub({
      selectedCount: 2,
      hasSelection: true,
      lastFailedFlagIds: ['id-1', 'id-2'],
      flagResult: 'error',   // first call fails
      retryResult: 'success' // retry succeeds
    });
    const fixture = buildFixture(store);

    let callCount = 0;
    const sb = fixture.debugElement.injector.get(MatSnackBar);
    const openSpy = spyOn(sb, 'open').and.callFake((...args: any[]) => {
      callCount++;
      return {
        // Only emit the retry action on the first (failure) snackbar open
        onAction: () => callCount === 1 ? retryAction$.asObservable() : of(),
        dismiss: () => {},
      } as any;
    });

    fixture.componentInstance.flagForReview();
    tick(); // failure snackbar shown

    // Simulate user clicking Retry
    retryAction$.next();
    retryAction$.complete();
    tick(); // retry resolves

    expect(store.retryLastFailedFlag).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith(
      '2 policies flagged for review',
      'Dismiss',
      jasmine.objectContaining({ duration: 4000 })
    );
  }));

  // ── clearSelection ───────────────────────────────────────────────────────

  it('delegates clearSelection to the store', () => {
    const store = makeStoreStub({ selectedCount: 2, hasSelection: true });
    const fixture = buildFixture(store);
    fixture.componentInstance.clearSelection();
    expect(store.clearSelection).toHaveBeenCalled();
  });

  // ── button disabled state ────────────────────────────────────────────────

  it('flag button is disabled when nothing is selected', () => {
    const store = makeStoreStub({ selectedCount: 0, hasSelection: false });
    const fixture = buildFixture(store);
    const btn = fixture.nativeElement.querySelector('.flag-btn') as HTMLButtonElement;
    expect(btn.disabled).toBeTrue();
  });

  it('flag button is enabled when rows are selected', () => {
    const store = makeStoreStub({ selectedCount: 1, hasSelection: true });
    const fixture = buildFixture(store);
    const btn = fixture.nativeElement.querySelector('.flag-btn') as HTMLButtonElement;
    expect(btn.disabled).toBeFalse();
  });

  // ── no-op guard when selectedCount is 0 ─────────────────────────────────

  it('flagForReview() is a no-op when selectedCount is 0', fakeAsync(() => {
    const store = makeStoreStub({ selectedCount: 0, hasSelection: false });
    const fixture = buildFixture(store);
    spySnackBar(fixture);

    fixture.componentInstance.flagForReview();
    tick();

    expect(store.flagSelectedPolicies).not.toHaveBeenCalled();
  }));
});
