/**
 * SummaryPanelComponent
 *
 * What: Presentational KPI panel that reads store.summary() — a server-computed
 * aggregate over the current filtered set. Displays:
 *   - 4 status count cards (Active / Pending / Expired / Cancelled)
 *   - Total GWP + per-LOB bar chart (normalised to widest bar)
 *   - "Expiring within 30 days" SVG arc indicator
 *
 * Why server-computed summary: The summary endpoint applies the same filters as
 * /policies, so KPI numbers are always consistent with the filtered table — even
 * across multiple pages. Client-side aggregation over one page would be wrong.
 *
 * Why SVG arc over a CSS progress ring: The arc uses stroke-dashoffset which is
 * animatable and works without JavaScript. prefers-reduced-motion disables the
 * transition at the CSS level so the component never needs to read the media query.
 *
 * Why color is never the sole signal: Each status card carries both a color badge
 * AND an icon AND a text label — users with colour blindness can distinguish cards
 * by icon shape alone.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { PolicyStore } from '../../store/policy.store';
import { PolicyStatus } from '../../models/policy.model';

interface StatusCard {
  status: PolicyStatus;
  icon: string;
  colorClass: string;
  label: string;
}

const STATUS_CARDS: StatusCard[] = [
  { status: 'Active',    icon: 'check_circle', colorClass: 'card-active',    label: 'Active policies' },
  { status: 'Pending',   icon: 'pending',      colorClass: 'card-pending',   label: 'Pending policies' },
  { status: 'Expired',   icon: 'cancel',       colorClass: 'card-expired',   label: 'Expired policies' },
  { status: 'Cancelled', icon: 'block',        colorClass: 'card-cancelled', label: 'Cancelled policies' }
];

const LOB_LABELS: Record<string, string> = {
  Property: 'Property',
  Casualty: 'Casualty',
  'A&H':    'A&H',
  Marine:   'Marine'
};

/** SVG arc radius (px) — used in both template and computation. */
const ARC_R = 44;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_R;

@Component({
  selector: 'app-summary-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CurrencyPipe,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './summary-panel.component.html',
  styleUrl: './summary-panel.component.scss'
})
export class SummaryPanelComponent {
  protected readonly store = inject(PolicyStore);

  /** Emits the PolicyStatus when a status card is clicked → parent opens drilldown dialog. */
  readonly statusClick = output<PolicyStatus>();

  /** Emits when the expiry arc is clicked → parent opens expiry drilldown. */
  readonly expiryClick = output<void>();

  readonly statusCards = STATUS_CARDS;
  readonly arcCircumference = ARC_CIRCUMFERENCE;

  // ── Computed values derived from store.summary() ──────────────────────────

  readonly totalPolicies = computed(() => {
    const s = this.store.summary();
    return s.active + s.pending + s.expired + s.cancelled;
  });

  /**
   * Fraction of active policies expiring within 30 days, clamped to [0, 1].
   * Used to drive the SVG arc stroke-dashoffset.
   */
  readonly expiryFraction = computed(() => {
    const s = this.store.summary();
    if (!s.active) return 0;
    return Math.min(s.expiringWithin30Days / s.active, 1);
  });

  /**
   * SVG stroke-dashoffset for the arc.
   * Full circle = circumference (0%); empty = 0 (100%).
   * Offset = circumference * (1 - fraction) so the arc fills clockwise.
   */
  readonly arcOffset = computed(() =>
    ARC_CIRCUMFERENCE * (1 - this.expiryFraction())
  );

  /** LOB entries sorted by GWP descending — used for the bar chart. */
  readonly lobEntries = computed(() => {
    const gwp = this.store.summary().gwpByLob;
    const entries = Object.entries(gwp)
      .map(([lob, amount]) => ({ lob, label: LOB_LABELS[lob] ?? lob, amount: amount ?? 0 }))
      .sort((a, b) => b.amount - a.amount);

    const max = entries[0]?.amount ?? 1;
    return entries.map(e => ({ ...e, widthPct: Math.round((e.amount / max) * 100) }));
  });

  /** Count for a given status, read from store.summary(). */
  countFor(status: PolicyStatus): number {
    const s = this.store.summary();
    switch (status) {
      case 'Active':    return s.active;
      case 'Pending':   return s.pending;
      case 'Expired':   return s.expired;
      case 'Cancelled': return s.cancelled;
    }
  }

  onStatusClick(status: PolicyStatus): void {
    this.statusClick.emit(status);
  }

  onExpiryClick(): void {
    this.expiryClick.emit();
  }
}
