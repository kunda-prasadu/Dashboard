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
  description: string;
}

const STATUS_CARDS: StatusCard[] = [
  { status: 'Active',    icon: 'check_circle', colorClass: 'card-active',    label: 'ACTIVE POLICIES',    description: 'currently in force'  },
  { status: 'Pending',   icon: 'schedule',     colorClass: 'card-pending',   label: 'PENDING POLICIES',   description: 'awaiting approval'   },
  { status: 'Expired',   icon: 'warning',      colorClass: 'card-expired',   label: 'EXPIRED POLICIES',   description: 'past coverage end'   },
  { status: 'Cancelled', icon: 'cancel',       colorClass: 'card-cancelled', label: 'CANCELLED POLICIES', description: 'terminated policies' }
];

const LOB_LABELS: Record<string, string> = {
  Property: 'Property',
  Casualty: 'Casualty',
  'A&H':    'A&H',
  Marine:   'Marine'
};

const LOB_ICONS: Record<string, string> = {
  Property: 'home',
  Casualty: 'security',
  'A&H':    'favorite',
  Marine:   'anchor'
};

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

  readonly statusClick = output<PolicyStatus>();
  readonly expiryClick = output<void>();

  readonly statusCards = STATUS_CARDS;
  readonly arcCircumference = ARC_CIRCUMFERENCE;

  readonly totalPolicies = computed(() => {
    const s = this.store.summary();
    return s.active + s.pending + s.expired + s.cancelled;
  });

  readonly expiryFraction = computed(() => {
    const s = this.store.summary();
    if (!s.active) return 0;
    return Math.min(s.expiringWithin30Days / s.active, 1);
  });

  readonly expiryPct = computed(() => {
    const s = this.store.summary();
    if (!s.active) return 0;
    return Math.round(Math.min(s.expiringWithin30Days / s.active, 1) * 100);
  });

  readonly arcOffset = computed(() =>
    ARC_CIRCUMFERENCE * (1 - this.expiryFraction())
  );

  readonly lobEntries = computed(() => {
    const gwp = this.store.summary().gwpByLob;
    const entries = Object.entries(gwp)
      .map(([lob, amount]) => ({
        lob,
        label: LOB_LABELS[lob] ?? lob,
        icon: LOB_ICONS[lob] ?? 'business',
        amount: amount ?? 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const max = entries[0]?.amount ?? 1;
    const total = entries.reduce((sum, e) => sum + e.amount, 0) || 1;
    return entries.map(e => ({
      ...e,
      widthPct: Math.round((e.amount / max) * 100),
      pct: Math.round((e.amount / total) * 100)
    }));
  });

  countFor(status: PolicyStatus): number {
    const s = this.store.summary();
    switch (status) {
      case 'Active':    return s.active;
      case 'Pending':   return s.pending;
      case 'Expired':   return s.expired;
      case 'Cancelled': return s.cancelled;
    }
  }

  lobIcon(lob: string): string {
    return LOB_ICONS[lob] ?? 'business';
  }

  lobBarClass(lob: string): string {
    return 'bar-fill bar-' + lob.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  onStatusClick(status: PolicyStatus): void {
    this.statusClick.emit(status);
  }

  onExpiryClick(): void {
    this.expiryClick.emit();
  }
}
