/**
 * Why signals over NgRx for this feature:
 * - Single feature scope: NgRx is justified when multiple features share global state.
 *   Here we have one slice, making the actions/reducers/selectors/effects overhead (~4×
 *   the code) pure ceremony.
 * - Native Angular: signals are first-class in Angular 17+. No extra deps, no devtools
 *   plugin required, and computed() / effect() compose naturally with the template.
 * - Optimistic updates are straightforward: snapshot → mutate signal → HTTP → rollback
 *   on error. NgRx would need optimisticUpdate from @ngrx/effects plus action pairs.
 */

import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, Observable, tap, throwError } from 'rxjs';
import { PolicyApiService } from '../services/policy-api.service';
import { StorageService } from '../../../core/services/storage.service';
import { Policy } from '../models/policy.model';
import { PolicyFilter } from '../models/policy-filter.model';
import { PageRequest } from '../models/pagination.model';
import { EMPTY_SUMMARY, PolicySummaryData } from '../models/policy-summary.model';
import { NormalisedHttpError } from '../../../core/interceptors/error.interceptor';
import { STORAGE_KEYS, PAGE_SIZE_OPTIONS } from '../constants/policy.constants';

type SortState = { field: string; order: 'asc' | 'desc' };

@Injectable({ providedIn: 'root' })
export class PolicyStore {
  private readonly api        = inject(PolicyApiService);
  private readonly storage    = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Private state signals ────────────────────────────────────────────────
  private readonly _policies          = signal<Policy[]>([]);
  private readonly _total             = signal<number>(0);
  private readonly _summary           = signal<PolicySummaryData>(EMPTY_SUMMARY);
  private readonly _pagination        = signal<PageRequest>({
    pageIndex: 0,
    pageSize: (() => {
      const n = this.storage.get<number>(STORAGE_KEYS.PAGE_SIZE);
      return n && PAGE_SIZE_OPTIONS.includes(n) ? n : 25;
    })()
  });
  private readonly _loading           = signal<boolean>(false);
  private readonly _error             = signal<string | null>(null);
  private readonly _filters           = signal<PolicyFilter>({});
  private readonly _sort              = signal<SortState>({ field: 'expiryDate', order: 'asc' });
  private readonly _selectedIds       = signal<Set<string>>(new Set());
  private readonly _lastFailedFlagIds = signal<string[]>([]);

  // ── Public readonly signals ──────────────────────────────────────────────
  readonly policies           = this._policies.asReadonly();
  readonly total              = this._total.asReadonly();
  readonly summary            = this._summary.asReadonly();
  readonly pagination         = this._pagination.asReadonly();
  readonly loading            = this._loading.asReadonly();
  readonly error              = this._error.asReadonly();
  readonly filters            = this._filters.asReadonly();
  readonly sort               = this._sort.asReadonly();
  readonly selectedIds        = this._selectedIds.asReadonly();
  readonly lastFailedFlagIds  = this._lastFailedFlagIds.asReadonly();

  // ── Computed ─────────────────────────────────────────────────────────────
  readonly selectedCount = computed(() => this._selectedIds().size);
  readonly hasSelection  = computed(() => this._selectedIds().size > 0);

  // ── Actions ──────────────────────────────────────────────────────────────

  loadPolicies(): void {
    this._loading.set(true);
    this._error.set(null);

    forkJoin({
      page:    this.api.getAll(this._filters(), this._sort(), this._pagination()),
      summary: this.api.getSummary(this._filters())
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ page, summary }) => {
          this._policies.set(page.data);
          this._total.set(page.total);
          this._summary.set(summary);
          this._selectedIds.set(new Set());
          this._loading.set(false);
        },
        error: (err: NormalisedHttpError) => {
          this._error.set(err.message);
          this._loading.set(false);
        }
      });
  }

  updateFilters(filters: PolicyFilter): void {
    this._filters.set(filters);
    this._pagination.update(p => ({ ...p, pageIndex: 0 }));
    this.loadPolicies();
  }

  clearFilters(): void {
    this._filters.set({});
    this._pagination.update(p => ({ ...p, pageIndex: 0 }));
    this.loadPolicies();
  }

  updateSort(field: string, order: 'asc' | 'desc'): void {
    this._sort.set({ field, order });
    this._pagination.update(p => ({ ...p, pageIndex: 0 }));
    this.loadPolicies();
  }

  setPage(pageIndex: number, pageSize: number): void {
    this.storage.set(STORAGE_KEYS.PAGE_SIZE, pageSize);
    this._pagination.set({ pageIndex, pageSize });
    this.loadPolicies();
  }

  toggleSelection(id: string): void {
    this._selectedIds.update(ids => {
      const next = new Set(ids);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  selectAll(): void {
    this._selectedIds.set(new Set(this._policies().map(p => p.id)));
  }

  clearSelection(): void {
    this._selectedIds.set(new Set());
  }

  /**
   * Optimistically flags selected policies for review and returns an Observable so
   * callers (e.g. BulkActionBarComponent) can show snackbar on success/failure.
   * The store handles all state mutations; the caller only handles UI feedback.
   */
  flagSelectedPolicies(): Observable<Policy[]> {
    const ids = [...this._selectedIds()];

    // Optimistic update — flip flags immediately before HTTP confirms
    this._policies.update(list =>
      list.map(p => ids.includes(p.id) ? { ...p, flaggedForReview: true } : p)
    );
    this._lastFailedFlagIds.set([]);

    return this.api.flagPolicies(ids).pipe(
      tap((updated) => {
        this._policies.update(list =>
          list.map(p => updated.find(u => u.id === p.id) ?? p)
        );
        this.clearSelection();
      }),
      catchError((err: NormalisedHttpError) => {
        // Rollback optimistic update
        this._policies.update(list =>
          list.map(p => ids.includes(p.id) ? { ...p, flaggedForReview: false } : p)
        );
        this._lastFailedFlagIds.set(ids);
        this._error.set(err.message);
        return throwError(() => err);
      })
    );
  }

  /** Re-attempts flagging the IDs that failed in the previous call. */
  retryLastFailedFlag(): Observable<Policy[]> {
    const ids = this._lastFailedFlagIds();
    this._selectedIds.set(new Set(ids));
    return this.flagSelectedPolicies();
  }

  renewPolicy(id: string): void {
    const original = this._policies().find(p => p.id === id);
    if (!original) return;

    const today = new Date();
    const newExpiry = new Date(today);
    newExpiry.setFullYear(today.getFullYear() + 1);
    const changes: Partial<Policy> = {
      status: 'Active',
      effectiveDate: today.toISOString().split('T')[0],
      expiryDate: newExpiry.toISOString().split('T')[0]
    };

    // Optimistic update
    this._policies.update(list =>
      list.map(p => p.id === id ? { ...p, ...changes } : p)
    );

    this.api.patch(id, changes)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.api.getSummary(this._filters())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: s => this._summary.set(s) });
        },
        error: (err: NormalisedHttpError) => {
          // Rollback
          this._policies.update(list =>
            list.map(p => p.id === id ? original : p)
          );
          this._error.set(err.message);
        }
      });
  }
}
