/**
 * PolicyFilterComponent
 *
 * What: A reactive filter bar — free-text search plus multi-select chips for
 * status, LOB, region, date ranges, and premium min. Drives server-side
 * filtering by calling store.updateFilters() with the current form value.
 *
 * Why two subscriptions on valueChanges:
 * 1. Immediate subscription → updates the active-chip snapshot for instant UI feedback.
 * 2. debounceTime(400) subscription → calls store.updateFilters(), persists to
 *    localStorage, and syncs the URL. This ensures we don't fire an API request on
 *    every keystroke while keeping the chip count responsive.
 *
 * Why URL sync (queryParamsHandling: 'merge', replaceUrl: true):
 * Filters become part of the URL so users can bookmark or share a filtered view.
 * replaceUrl prevents the browser history from filling up with intermediate states.
 *
 * Seed priority on init: URL query params → localStorage → defaults.
 * URL wins so that shared links always restore the sender's exact view.
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  computed,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import {
  FilterBottomSheetComponent,
  type FilterBottomSheetData
} from '../filter-bottom-sheet/filter-bottom-sheet.component';

import { PolicyStore } from '../../store/policy.store';
import { StorageService } from '../../../../core/services/storage.service';
import { PolicyFilter } from '../../models/policy-filter.model';
import {
  POLICY_STATUSES,
  REGIONS,
  LINES_OF_BUSINESS,
  STORAGE_KEYS
} from '../../constants/policy.constants';
import { PolicyStatus, LineOfBusiness, Region } from '../../models/policy.model';

interface FilterFormValue {
  search: string;
  statuses: PolicyStatus[];
  linesOfBusiness: LineOfBusiness[];
  regions: Region[];
  premiumMin: number | null;
  effectiveDateFrom: Date | null;
  effectiveDateTo: Date | null;
  expiryDateFrom: Date | null;
  expiryDateTo: Date | null;
}

@Component({
  selector: 'app-policy-filter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatBadgeModule,
    MatBottomSheetModule
  ],
  templateUrl: './policy-filter.component.html',
  styleUrl: './policy-filter.component.scss'
})
export class PolicyFilterComponent implements OnInit {
  private readonly store       = inject(PolicyStore);
  private readonly storage     = inject(StorageService);
  private readonly fb          = inject(FormBuilder);
  private readonly router      = inject(Router);
  private readonly route       = inject(ActivatedRoute);
  private readonly destroyRef  = inject(DestroyRef);
  private readonly bottomSheet = inject(MatBottomSheet);

  readonly statuses        = POLICY_STATUSES;
  readonly linesOfBusiness = LINES_OF_BUSINESS;
  readonly regions         = REGIONS;

  readonly form: FormGroup = this.fb.group({
    search:            [''],
    statuses:          [[]],
    linesOfBusiness:   [[]],
    regions:           [[]],
    premiumMin:        [null],
    effectiveDateFrom: [null],
    effectiveDateTo:   [null],
    expiryDateFrom:    [null],
    expiryDateTo:      [null]
  });

  /** Live snapshot for chips — updated immediately on every value change. */
  private readonly _snapshot = signal<FilterFormValue>(this.form.value as FilterFormValue);

  /** Number of active (non-empty) filter fields — shown on the filter badge. */
  readonly activeFilterCount = computed(() => {
    const v = this._snapshot();
    let count = 0;
    if (v.search?.trim())             count++;
    if (v.statuses?.length)           count++;
    if (v.linesOfBusiness?.length)    count++;
    if (v.regions?.length)            count++;
    if (v.premiumMin != null)         count++;
    if (v.effectiveDateFrom)          count++;
    if (v.effectiveDateTo)            count++;
    if (v.expiryDateFrom)             count++;
    if (v.expiryDateTo)               count++;
    return count;
  });

  readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0);

  ngOnInit(): void {
    // Seed form: URL params → localStorage → defaults
    const urlParams  = this.route.snapshot.queryParams;
    const storedRaw  = this.storage.get<PolicyFilter>(STORAGE_KEYS.FILTERS);
    const seedFilter = this.mergeSeeds(urlParams, storedRaw);
    if (seedFilter) this.patchFormFromFilter(seedFilter);

    // Subscription 1: immediate snapshot for chips
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this._snapshot.set(v as FilterFormValue));

    // Subscription 2: debounced → API + storage + URL
    this.form.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((v: FilterFormValue) => {
        const filter = this.mapToStoreFilter(v);
        this.store.updateFilters(filter);
        this.storage.set(STORAGE_KEYS.FILTERS, filter);
        this.syncUrl(filter);
      });
  }

  // ── Public methods (used by template + spec) ──────────────────────────────

  openFilters(): void {
    this.bottomSheet.open(FilterBottomSheetComponent, {
      data: {
        form:            this.form,
        statuses:        this.statuses,
        linesOfBusiness: this.linesOfBusiness,
        regions:         this.regions
      } satisfies FilterBottomSheetData,
      panelClass: 'filter-bottom-sheet-panel'
    });
  }

  removeStatus(status: PolicyStatus): void {
    const current: PolicyStatus[] = this.form.get('statuses')?.value ?? [];
    this.form.get('statuses')?.setValue(current.filter(s => s !== status));
  }

  removeLob(lob: LineOfBusiness): void {
    const current: LineOfBusiness[] = this.form.get('linesOfBusiness')?.value ?? [];
    this.form.get('linesOfBusiness')?.setValue(current.filter(l => l !== lob));
  }

  removeRegion(region: Region): void {
    const current: Region[] = this.form.get('regions')?.value ?? [];
    this.form.get('regions')?.setValue(current.filter(r => r !== region));
  }

  clearAll(): void {
    this.form.reset({
      search: '', statuses: [], linesOfBusiness: [], regions: [],
      premiumMin: null, effectiveDateFrom: null, effectiveDateTo: null,
      expiryDateFrom: null, expiryDateTo: null
    });
    this.store.clearFilters();
    this.storage.remove(STORAGE_KEYS.FILTERS);
    this.syncUrl({});
  }

  // ── Helpers (internal + exposed for testing) ──────────────────────────────

  mapToStoreFilter(v: FilterFormValue): PolicyFilter {
    const filter: PolicyFilter = {};
    if (v.search?.trim())             filter.search            = v.search.trim();
    if (v.statuses?.length)           filter.statuses          = v.statuses;
    if (v.linesOfBusiness?.length)    filter.linesOfBusiness   = v.linesOfBusiness;
    if (v.regions?.length)            filter.regions           = v.regions;
    if (v.premiumMin != null)         filter.premiumMin        = v.premiumMin;
    if (v.effectiveDateFrom)          filter.effectiveDateFrom = this.toIso(v.effectiveDateFrom);
    if (v.effectiveDateTo)            filter.effectiveDateTo   = this.toIso(v.effectiveDateTo);
    if (v.expiryDateFrom)             filter.expiryDateFrom    = this.toIso(v.expiryDateFrom);
    if (v.expiryDateTo)               filter.expiryDateTo      = this.toIso(v.expiryDateTo);
    return filter;
  }

  syncUrl(filter: PolicyFilter): void {
    const params: Record<string, string | string[] | null> = {
      search:            filter.search            ?? null,
      status:            filter.statuses          ?? null,
      lineOfBusiness:    filter.linesOfBusiness   ?? null,
      region:            filter.regions           ?? null,
      premiumMin:        filter.premiumMin != null ? String(filter.premiumMin) : null,
      effectiveDateFrom: filter.effectiveDateFrom ?? null,
      effectiveDateTo:   filter.effectiveDateTo   ?? null,
      expiryDateFrom:    filter.expiryDateFrom    ?? null,
      expiryDateTo:      filter.expiryDateTo      ?? null
    };
    // Remove null entries so the URL stays clean
    Object.keys(params).forEach(k => { if (params[k] == null) delete params[k]; });

    void this.router.navigate([], {
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private mergeSeeds(
    urlParams: Record<string, string | string[]>,
    stored: PolicyFilter | null
  ): PolicyFilter | null {
    // URL wins over localStorage
    const hasUrl = Object.keys(urlParams).some(k =>
      ['search', 'status', 'lineOfBusiness', 'region', 'premiumMin',
       'effectiveDateFrom', 'effectiveDateTo', 'expiryDateFrom', 'expiryDateTo'].includes(k)
    );
    if (hasUrl) return this.urlParamsToFilter(urlParams);
    return stored;
  }

  private urlParamsToFilter(params: Record<string, string | string[]>): PolicyFilter {
    const toArray = (v: string | string[] | undefined): string[] =>
      v ? (Array.isArray(v) ? v : [v]) : [];

    return {
      search:            params['search'] as string | undefined,
      statuses:          toArray(params['status']) as PolicyStatus[],
      linesOfBusiness:   toArray(params['lineOfBusiness']) as LineOfBusiness[],
      regions:           toArray(params['region']) as Region[],
      premiumMin:        params['premiumMin'] ? Number(params['premiumMin']) : undefined,
      effectiveDateFrom: params['effectiveDateFrom'] as string | undefined,
      effectiveDateTo:   params['effectiveDateTo']   as string | undefined,
      expiryDateFrom:    params['expiryDateFrom']    as string | undefined,
      expiryDateTo:      params['expiryDateTo']      as string | undefined
    };
  }

  private patchFormFromFilter(f: PolicyFilter): void {
    this.form.patchValue({
      search:            f.search            ?? '',
      statuses:          f.statuses          ?? [],
      linesOfBusiness:   f.linesOfBusiness   ?? [],
      regions:           f.regions           ?? [],
      premiumMin:        f.premiumMin        ?? null,
      effectiveDateFrom: f.effectiveDateFrom ? new Date(f.effectiveDateFrom) : null,
      effectiveDateTo:   f.effectiveDateTo   ? new Date(f.effectiveDateTo)   : null,
      expiryDateFrom:    f.expiryDateFrom    ? new Date(f.expiryDateFrom)     : null,
      expiryDateTo:      f.expiryDateTo      ? new Date(f.expiryDateTo)       : null
    }, { emitEvent: false });
  }

  private toIso(date: Date | null): string | undefined {
    return date ? date.toISOString().split('T')[0] : undefined;
  }
}
