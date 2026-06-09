/**
 * PolicyOverviewPage
 *
 * What: The top-level routed page for the policy dashboard. Acts as the smart
 * shell that bootstraps the store on init and composes the table and (future)
 * filter panel components.
 *
 * Why a page/shell pattern: Keeps routing concerns (title, guard, resolver) at
 * the page level while child components stay presentational and testable without
 * a router dependency.
 */
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { PolicyTableComponent } from '../../components/policy-table/policy-table.component';
import { PolicyStore } from '../../store/policy.store';

@Component({
  selector: 'app-policy-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PolicyTableComponent],
  template: `
    <main class="policy-overview-page">
      <h1 class="page-title">Policy Portfolio</h1>
      <app-policy-table (rowClick)="onRowClick($event)" />
    </main>
  `,
  styles: [`
    .policy-overview-page {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .page-title {
      font: var(--mat-sys-headline-small);
      color: var(--mat-sys-on-surface);
      margin: 0 0 24px;
    }
  `]
})
export class PolicyOverviewPage implements OnInit {
  private readonly store = inject(PolicyStore);

  ngOnInit(): void {
    this.store.loadPolicies();
  }

  onRowClick(id: string): void {
    // Navigation to detail page wired in Phase 4+
    console.info('[PolicyHub] View details:', id);
  }
}
