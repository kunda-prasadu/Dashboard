/**
 * PolicyOverviewPage
 *
 * What: Smart container (routed shell) for the policy dashboard. Owns all state
 * transitions — loading skeleton, error recovery, empty state, and the live table.
 * Child components are presentational and store-agnostic where possible.
 *
 * Why a dedicated page/shell pattern:
 * - Routing concerns (title, guard, resolver) live here; children stay route-agnostic.
 * - Single point where store.loadPolicies() is bootstrapped, avoiding duplicate calls.
 * - State-branching logic (@if loading / error / empty / data) belongs at the
 *   orchestration layer, not inside individual presentational components.
 *
 * @defer (on idle) around the table section:
 * Defers Angular's instantiation of PolicyTableComponent and its Material dependencies
 * until the browser is idle — the filter bar and summary panel paint first, giving a
 * faster Largest Contentful Paint. The skeleton placeholder fills the space until idle.
 *
 * Dialog on rowClick:
 * Opens PolicyDetailDialogComponent via MatDialog. Dialog keeps the user in the table
 * context (preserves filters, scroll, selection) and returns focus to the trigger row
 * on close (MatDialog default behaviour).
 */
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PolicyTableComponent } from '../../components/policy-table/policy-table.component';
import { PolicyFilterComponent } from '../../components/policy-filter/policy-filter.component';
import { SummaryPanelComponent } from '../../components/summary-panel/summary-panel.component';
import { BulkActionBarComponent } from '../../components/bulk-action-bar/bulk-action-bar.component';
import { LoadingSkeletonComponent } from '../../../../shared/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../../../shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/error-state/error-state.component';
import {
  PolicyDetailDialogComponent,
  type PolicyDetailDialogData,
} from '../../components/policy-detail-dialog/policy-detail-dialog.component';
import { PolicyStore } from '../../store/policy.store';
import { PolicyStatus } from '../../models/policy.model';

@Component({
  selector: 'app-policy-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PolicyFilterComponent,
    SummaryPanelComponent,
    BulkActionBarComponent,
    PolicyTableComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    MatDialogModule,
  ],
  templateUrl: './policy-overview.page.html',
  styleUrl: './policy-overview.page.scss',
})
export class PolicyOverviewPage implements OnInit {
  protected readonly store   = inject(PolicyStore);
  private  readonly dialog   = inject(MatDialog);

  ngOnInit(): void {
    this.store.loadPolicies();
  }

  onRowClick(id: string): void {
    const policy = this.store.policies().find(p => p.id === id);
    if (!policy) return;

    this.dialog.open<PolicyDetailDialogComponent, PolicyDetailDialogData>(
      PolicyDetailDialogComponent,
      {
        data: { policy },
        width: '560px',
        maxWidth: '95vw',
        autoFocus: 'button[cdkFocusInitial]',
        restoreFocus: true,
      }
    );
  }

  onStatusDrilldown(status: PolicyStatus): void {
    const current = this.store.filters();
    this.store.updateFilters({ ...current, statuses: [status] });
  }

  onExpiryDrilldown(): void {
    const today = new Date().toISOString().split('T')[0];
    const in30  = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0];
    this.store.updateFilters({ statuses: ['Active'], expiryDateFrom: today, expiryDateTo: in30 });
  }

  onClearFilters(): void {
    this.store.clearFilters();
  }
}
