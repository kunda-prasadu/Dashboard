/**
 * PolicyOverviewPage
 *
 * What: Top-level routed shell for the policy dashboard. Composes the filter bar
 * and the policy table; bootstraps the store on init.
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
import { PolicyStore } from '../../store/policy.store';

@Component({
  selector: 'app-policy-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PolicyTableComponent, PolicyFilterComponent],
  template: `
    <main class="policy-overview-page">
      <h1 class="page-title">Policy Portfolio</h1>
      <app-policy-filter />
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
  private readonly store = inject(PolicyStore);

  ngOnInit(): void {
    this.store.loadPolicies();
  }

  onRowClick(id: string): void {
    // Navigation to detail page — Phase 5+
    console.info('[PolicyHub] View details:', id);
  }
}
