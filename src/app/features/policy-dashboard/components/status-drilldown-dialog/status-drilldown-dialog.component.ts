import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PolicyApiService } from '../../services/policy-api.service';
import { PolicyFilter } from '../../models/policy-filter.model';
import { Policy } from '../../models/policy.model';

export interface StatusDrilldownData {
  title: string;
  subtitle: string;
  accentColor: string;
  count: number;
  filter: PolicyFilter;
}

@Component({
  selector: 'app-status-drilldown-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DatePipe,
    MatDialogModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './status-drilldown-dialog.component.html',
  styleUrl:    './status-drilldown-dialog.component.scss'
})
export class StatusDrilldownDialogComponent implements OnInit {
  readonly data      = inject<StatusDrilldownData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<StatusDrilldownDialogComponent>);
  private  readonly api = inject(PolicyApiService);

  readonly policies = signal<Policy[]>([]);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);

  readonly columns = ['policyNumber', 'policyHolderName', 'lineOfBusiness', 'region', 'premium', 'expiryDate'];

  ngOnInit(): void {
    this.api
      .getAll(this.data.filter, { field: 'expiryDate', order: 'asc' }, { pageIndex: 0, pageSize: 200 })
      .subscribe({
        next: page => {
          this.policies.set(page.data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load policies. Please try again.');
          this.loading.set(false);
        }
      });
  }

  formatPremium(amount: number, currency: string): string {
    if (amount >= 1_000_000) return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000)     return `${currency} ${(amount / 1_000).toFixed(0)}K`;
    return `${currency} ${amount}`;
  }

  lobClass(lob: string): string {
    return 'lob-badge lob-' + lob.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  close(): void {
    this.dialogRef.close();
  }
}
