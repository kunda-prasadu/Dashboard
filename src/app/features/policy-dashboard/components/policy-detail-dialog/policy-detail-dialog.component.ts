/**
 * PolicyDetailDialogComponent
 *
 * What: Modal dialog showing full details for a single policy row. Opened by
 * PolicyOverviewPage when the user clicks a table row or the "view" icon button.
 *
 * Why a dialog (not a route):
 * The dashboard is a table-centric tool. Navigating away loses scroll position,
 * filter state, and selection. A dialog keeps the user in context and returns
 * focus to the triggering row on close — a better keyboard and screen-reader UX.
 *
 * Accessibility:
 * - MatDialog sets role="dialog", aria-modal="true", and aria-labelledby automatically.
 * - The dialog title (`mat-dialog-title`) is the aria-labelledby target.
 * - ESC key closes the dialog (MatDialog default).
 * - Focus is trapped inside (MatDialog default) and restored to the trigger on close.
 * - Each field has a visible label — color is never the sole signal for status.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Policy } from '../../models/policy.model';
import { CurrencyPipe, DatePipe } from '@angular/common';

export interface PolicyDetailDialogData {
  policy: Policy;
}

@Component({
  selector: 'app-policy-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, CurrencyPipe, DatePipe],
  templateUrl: './policy-detail-dialog.component.html',
  styleUrl: './policy-detail-dialog.component.scss',
})
export class PolicyDetailDialogComponent {
  protected readonly data    = inject<PolicyDetailDialogData>(MAT_DIALOG_DATA);
  private  readonly dialogRef = inject(MatDialogRef<PolicyDetailDialogComponent>);

  protected get policy(): Policy { return this.data.policy; }

  protected readonly statusColorMap: Record<string, string> = {
    Active:    'var(--ph-active)',
    Expired:   'var(--ph-expired)',
    Pending:   'var(--ph-pending)',
    Cancelled: 'var(--ph-cancelled)',
  };

  close(): void {
    this.dialogRef.close();
  }
}
