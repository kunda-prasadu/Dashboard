/**
 * PolicyOverviewPage
 *
 * What: Top-level routed shell for the policy dashboard. Composes the filter bar,
 * summary panel, and policy table; bootstraps the store on init.
 *
 * Why a page/shell pattern: Keeps routing concerns (title, guard, resolver) at
 * the page level while child components stay presentational and testable without
 * a router dependency.
 *
 * Why store.loadPolicies() here (not in PolicyFilterComponent): The page is the
 * single authoritative trigger. The filter component seeds itself from URL/storage
 * on init, which fires valueChanges → store.updateFilters() → loadPolicies()
 * automatically. ngOnInit here covers the case where the user lands with no filters.
 */
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { PolicyTableComponent } from '../../components/policy-table/policy-table.component';
import { PolicyFilterComponent } from '../../components/policy-filter/policy-filter.component';
import { SummaryPanelComponent } from '../../components/summary-panel/summary-panel.component';
import { BulkActionBarComponent } from '../../components/bulk-action-bar/bulk-action-bar.component';
import { PolicyStore } from '../../store/policy.store';
import { PolicyStatus } from '../../models/policy.model';

@Component({
  selector: 'app-policy-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PolicyTableComponent, PolicyFilterComponent, SummaryPanelComponent, BulkActionBarComponent],
  template: `
    <main class="policy-overview-page">
      <h1 class="page-title">Policy Portfolio</h1>
      <app-policy-filter />
      <app-summary-panel
        (statusClick)="onStatusDrilldown($event)"
        (expiryClick)="onExpiryDrilldown()"
      />
      @if (store.hasSelection()) {
        <app-bulk-action-bar />
      }
      <app-policy-table (rowClick)="onRowClick($event)" />
    </main>
  `,
  styles: [`
    .policy-overview-page {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .page-title {
      font: var(--mat-sys-headline-small);
      color: var(--mat-sys-on-surface);
      margin: 0;
    }
  `]
})
export class PolicyOverviewPage implements OnInit {
  protected readonly store = inject(PolicyStore);

  ngOnInit(): void {
    this.store.loadPolicies();
  }

  onRowClick(id: string): void {
    // Navigation to detail page — Phase 5+
    console.info('[PolicyHub] View details:', id);
  }

  onStatusDrilldown(status: PolicyStatus): void {
    // Apply status filter via store — filter panel chips will reflect it
    const current = this.store.filters();
    this.store.updateFilters({ ...current, statuses: [status] });
  }

  onExpiryDrilldown(): void {
    // Filter to active policies expiring within 30 days
    const today = new Date().toISOString().split('T')[0];
    const in30  = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0];
    this.store.updateFilters({ statuses: ['Active'], expiryDateFrom: today, expiryDateTo: in30 });
  }
}
