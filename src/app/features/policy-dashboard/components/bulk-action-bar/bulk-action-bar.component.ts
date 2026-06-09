/**
 * BulkActionBarComponent
 *
 * What: A contextual action toolbar that appears when ≥1 policy row is selected.
 * Shows the selected count, a "Flag for Review" button, and a "Clear selection" button.
 * On success, shows a plural-aware MatSnackBar message. On failure, shows a snackbar
 * with a "Retry" action that re-attempts the failed flag batch.
 *
 * Why a separate component (not inline in PolicyOverviewPage):
 * - Isolates snackbar logic and retry UX from the page shell.
 * - Keeps it independently testable: stub the store signals, spy MatSnackBar.
 * - Visible state (@if store.hasSelection()) is trivially handled by the parent template.
 *
 * Why the store returns Observable<Policy[]> from flagSelectedPolicies():
 * The store owns state mutations (optimistic update + rollback). The component owns
 * UI feedback (snackbar). Returning an Observable keeps these concerns separate —
 * the component subscribes once and reacts to next/error without needing to know
 * about the underlying HTTP calls.
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PolicyStore } from '../../store/policy.store';

@Component({
  selector: 'app-bulk-action-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './bulk-action-bar.component.html',
  styleUrl: './bulk-action-bar.component.scss',
})
export class BulkActionBarComponent {
  protected readonly store = inject(PolicyStore);
  private readonly snackBar  = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  flagForReview(): void {
    const count = this.store.selectedCount();
    if (!count) return;

    this.store.flagSelectedPolicies()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.showSuccess(count),
        error: () => this.showFailure(),
      });
  }

  clearSelection(): void {
    this.store.clearSelection();
  }

  private showSuccess(count: number): void {
    const msg = count === 1
      ? '1 policy flagged for review'
      : `${count} policies flagged for review`;
    this.snackBar.open(msg, 'Dismiss', { duration: 4000, panelClass: 'snack-success' });
  }

  private showFailure(): void {
    const ref = this.snackBar.open(
      'Failed to flag policies. Please try again.',
      'Retry',
      { duration: 8000, panelClass: 'snack-error' }
    );

    ref.onAction()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const retryCount = this.store.lastFailedFlagIds().length;
        this.store.retryLastFailedFlag()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.showSuccess(retryCount),
            error: () => this.showFailure(),
          });
      });
  }
}
