/**
 * PolicyTableComponent
 *
 * What: Presentational table component that renders the current page of policies
 * from PolicyStore. Handles server-side sort, controlled pagination, and
 * row/bulk selection with indeterminate checkbox state.
 *
 * Why presentational (no direct HTTP): The store owns all data-fetching and state.
 * This component only reads signals and emits output events — making it trivially
 * testable and reusable without any HTTP dependency.
 *
 * Why controlled paginator (not MatTableDataSource): MatTableDataSource paginates
 * client-side. We hold one server page at a time; the paginator must reflect the
 * server total and delegate page changes back to the store.
 *
 * Why sticky header + sticky actions column: Wide policy tables scroll horizontally
 * on smaller viewports. Sticky columns keep context visible at all times.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output
} from '@angular/core';
import { CommonModule, getCurrencySymbol } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PolicyStore } from '../../store/policy.store';
import { Policy } from '../../models/policy.model';
import { PAGE_SIZE_OPTIONS } from '../../constants/policy.constants';

@Component({
  selector: 'app-policy-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './policy-table.component.html',
  styleUrl: './policy-table.component.scss'
})
export class PolicyTableComponent {
  protected readonly store = inject(PolicyStore);

  /** Emits the policy id when the user clicks the view-details action button. */
  readonly rowClick = output<string>();

  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  readonly displayedColumns = [
    'select',
    'policyNumber',
    'policyHolderName',
    'lineOfBusiness',
    'status',
    'region',
    'premium',
    'flagged',
    'actions'
  ] as const;

  /**
   * Ids of all policies on the current page.
   * Used to determine select-all / indeterminate state without scanning the full dataset.
   */
  readonly pageIds = computed(() => this.store.policies().map(p => p.id));

  /** True when every policy on the current page is selected. */
  readonly allSelected = computed(() => {
    const ids = this.pageIds();
    return ids.length > 0 && ids.every(id => this.store.selectedIds().has(id));
  });

  /** True when some but not all policies on the current page are selected. */
  readonly someSelected = computed(
    () => !this.allSelected() && this.pageIds().some(id => this.store.selectedIds().has(id))
  );

  // ── Track function ────────────────────────────────────────────────────────

  trackById(_: number, policy: Policy): string {
    return policy.id;
  }

  // ── Formatting ────────────────────────────────────────────────────────────

  /**
   * Compact premium display: S$1.2M, S$450K, S$12,500.
   * Why compact: premium values span 1,000–5,000,000; full numbers overwhelm a table cell.
   */
  formatPremium(amount: number, currency: string): string {
    const symbol = getCurrencySymbol(currency, 'narrow');
    if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000)     return `${symbol}${(amount / 1_000).toFixed(0)}K`;
    return `${symbol}${amount.toLocaleString()}`;
  }

  // ── Status badge helpers ──────────────────────────────────────────────────

  statusClass(status: string): string {
    return `status-badge status-${status.toLowerCase()}`;
  }

  lobClass(lob: string): string {
    return `lob-badge lob-${lob.toLowerCase().replace('&', '').replace(' ', '-')}`;
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  onSortChange(sort: Sort): void {
    // Empty active sort means reset to default; treat as expiryDate asc
    const field = sort.active || 'expiryDate';
    const order = sort.direction || 'asc';
    this.store.updateSort(field, order as 'asc' | 'desc');
  }

  onPage(event: PageEvent): void {
    this.store.setPage(event.pageIndex, event.pageSize);
  }

  onToggleSelectAll(): void {
    this.allSelected() ? this.store.clearSelection() : this.store.selectAll();
  }

  onToggleRow(id: string): void {
    this.store.toggleSelection(id);
  }

  onViewDetails(id: string): void {
    this.rowClick.emit(id);
  }
}
