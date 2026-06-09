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
import {
  StatusDrilldownDialogComponent,
  type StatusDrilldownData,
} from '../../components/status-drilldown-dialog/status-drilldown-dialog.component';
import { PolicyStore } from '../../store/policy.store';
import { PolicyStatus } from '../../models/policy.model';

const STATUS_META: Record<PolicyStatus, { label: string; color: string }> = {
  Active:    { label: 'Active Policies',    color: '#43A047' },
  Pending:   { label: 'Pending Policies',   color: '#FB8C00' },
  Expired:   { label: 'Expired Policies',   color: '#E53935' },
  Cancelled: { label: 'Cancelled Policies', color: '#757575' }
};

const DIALOG_DEFAULTS = {
  width:      '860px',
  maxWidth:   '95vw',
  maxHeight:  '85vh',
  autoFocus:  'button[cdkFocusInitial]',
  restoreFocus: true,
} as const;

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
  protected readonly store  = inject(PolicyStore);
  private  readonly dialog  = inject(MatDialog);

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
    const s    = this.store.summary();
    const meta = STATUS_META[status];
    const countMap: Record<PolicyStatus, number> = {
      Active: s.active, Pending: s.pending, Expired: s.expired, Cancelled: s.cancelled
    };

    this.dialog.open<StatusDrilldownDialogComponent, StatusDrilldownData>(
      StatusDrilldownDialogComponent,
      {
        ...DIALOG_DEFAULTS,
        data: {
          title:       meta.label,
          subtitle:    `Showing all ${status.toLowerCase()} policies`,
          accentColor: meta.color,
          count:       countMap[status],
          filter:      { statuses: [status] }
        }
      }
    );
  }

  onExpiryDrilldown(): void {
    const today = new Date().toISOString().split('T')[0];
    const in30  = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0];
    const count = this.store.summary().expiringWithin30Days;

    this.dialog.open<StatusDrilldownDialogComponent, StatusDrilldownData>(
      StatusDrilldownDialogComponent,
      {
        ...DIALOG_DEFAULTS,
        data: {
          title:       'Expiring in 30 Days',
          subtitle:    'Active policies with expiry date within the next 30 days',
          accentColor: '#E53935',
          count,
          filter:      { statuses: ['Active'], expiryDateFrom: today, expiryDateTo: in30 }
        }
      }
    );
  }

  onClearFilters(): void {
    this.store.clearFilters();
  }
}
