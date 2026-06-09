import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { PolicyFilterComponent } from './policy-filter.component';
import { PolicyStore } from '../../store/policy.store';
import { StorageService } from '../../../../core/services/storage.service';
import { PolicyFilter } from '../../models/policy-filter.model';

function makeStoreSpy() {
  return {
    updateFilters: jasmine.createSpy('updateFilters'),
    clearFilters:  jasmine.createSpy('clearFilters'),
    loadPolicies:  jasmine.createSpy('loadPolicies')
  };
}

function makeStorageSpy(stored: PolicyFilter | null = null) {
  return {
    get:    jasmine.createSpy('get').and.returnValue(stored),
    set:    jasmine.createSpy('set'),
    remove: jasmine.createSpy('remove')
  };
}

describe('PolicyFilterComponent', () => {
  let fixture: ComponentFixture<PolicyFilterComponent>;
  let component: PolicyFilterComponent;
  let storeSpy: ReturnType<typeof makeStoreSpy>;
  let storageSpy: ReturnType<typeof makeStorageSpy>;

  async function setup(
    queryParams: Record<string, string> = {},
    stored: PolicyFilter | null = null
  ) {
    storeSpy   = makeStoreSpy();
    storageSpy = makeStorageSpy(stored);

    await TestBed.configureTestingModule({
      imports: [PolicyFilterComponent, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PolicyStore,    useValue: storeSpy },
        { provide: StorageService, useValue: storageSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParams } }
        }
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(PolicyFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('activeFilterCount()', () => {
    it('returns 0 when form is empty', async () => {
      await setup();
      expect(component.activeFilterCount()).toBe(0);
    });

    it('counts each non-empty field independently', async () => {
      await setup();
      component.form.patchValue({ search: 'Wei', statuses: ['Active'], regions: ['Singapore'] });
      fixture.detectChanges();
      expect(component.activeFilterCount()).toBe(3);
    });

    it('counts premiumMin when set', async () => {
      await setup();
      component.form.patchValue({ premiumMin: 10000 });
      fixture.detectChanges();
      expect(component.activeFilterCount()).toBe(1);
    });
  });

  describe('mapToStoreFilter()', () => {
    it('omits empty fields from the filter object', async () => {
      await setup();
      const result = component.mapToStoreFilter({
        search: '  ', statuses: [], linesOfBusiness: [], regions: [],
        premiumMin: null, effectiveDateFrom: null, effectiveDateTo: null,
        expiryDateFrom: null, expiryDateTo: null
      });
      expect(result).toEqual({});
    });

    it('maps populated fields correctly', async () => {
      await setup();
      const result = component.mapToStoreFilter({
        search: 'Wong', statuses: ['Active'], linesOfBusiness: ['Marine'],
        regions: ['Singapore'], premiumMin: 5000,
        effectiveDateFrom: new Date('2025-01-01'), effectiveDateTo: null,
        expiryDateFrom: null, expiryDateTo: null
      });
      expect(result.search).toBe('Wong');
      expect(result.statuses).toEqual(['Active']);
      expect(result.linesOfBusiness).toEqual(['Marine']);
      expect(result.regions).toEqual(['Singapore']);
      expect(result.premiumMin).toBe(5000);
      expect(result.effectiveDateFrom).toBe('2025-01-01');
    });

    it('maps all four date fields when every date is set', async () => {
      await setup();
      const result = component.mapToStoreFilter({
        search: null, statuses: [], linesOfBusiness: [], regions: [],
        premiumMin: null,
        effectiveDateFrom: new Date('2025-01-01'),
        effectiveDateTo:   new Date('2025-06-30'),
        expiryDateFrom:    new Date('2025-07-01'),
        expiryDateTo:      new Date('2026-06-30')
      } as any);
      expect(result.effectiveDateFrom).toBe('2025-01-01');
      expect(result.effectiveDateTo).toBe('2025-06-30');
      expect(result.expiryDateFrom).toBe('2025-07-01');
      expect(result.expiryDateTo).toBe('2026-06-30');
    });
  });

  describe('syncUrl()', () => {
    it('navigates with filter params, replaceUrl, merge strategy', async () => {
      await setup();
      const routerSpy = jasmine.createSpy('navigate');
      // Access the router via the component's private injection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component as any).router = { navigate: routerSpy };

      component.syncUrl({ search: 'Wei', statuses: ['Active'] });
      expect(routerSpy).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({
          queryParamsHandling: 'merge',
          replaceUrl: true
        })
      );
    });
  });

  describe('chip removal', () => {
    it('removeStatus removes the given status from the form array', async () => {
      await setup();
      component.form.patchValue({ statuses: ['Active', 'Pending'] });
      component.removeStatus('Active');
      expect(component.form.get('statuses')?.value).toEqual(['Pending']);
    });

    it('removeLob removes the given LOB from the form array', async () => {
      await setup();
      component.form.patchValue({ linesOfBusiness: ['Marine', 'Property'] });
      component.removeLob('Marine');
      expect(component.form.get('linesOfBusiness')?.value).toEqual(['Property']);
    });

    it('removeRegion removes the given region from the form array', async () => {
      await setup();
      component.form.patchValue({ regions: ['Singapore', 'Japan'] });
      component.removeRegion('Singapore');
      expect(component.form.get('regions')?.value).toEqual(['Japan']);
    });
  });

  describe('clearAll()', () => {
    it('resets form, calls store.clearFilters(), removes storage key', async () => {
      await setup();
      component.form.patchValue({ search: 'Wei', statuses: ['Active'] });
      component.clearAll();
      expect(component.form.get('search')?.value).toBe('');
      expect(storeSpy.clearFilters).toHaveBeenCalled();
      expect(storageSpy.remove).toHaveBeenCalled();
    });
  });

  describe('seed priority', () => {
    it('seeds from URL params when present (URL wins over localStorage)', async () => {
      await setup({ search: 'url-search', status: 'Active' }, { search: 'stored-search' });
      expect(component.form.get('search')?.value).toBe('url-search');
    });

    it('seeds from localStorage when no URL params', async () => {
      await setup({}, { search: 'stored-search', statuses: ['Expired'] });
      expect(component.form.get('search')?.value).toBe('stored-search');
      expect(component.form.get('statuses')?.value).toEqual(['Expired']);
    });

    it('seeds premiumMin from URL param and converts to number', async () => {
      await setup({ premiumMin: '5000' });
      expect(component.form.get('premiumMin')?.value).toBe(5000);
    });

    it('seeds all date fields from URL params', async () => {
      await setup({
        effectiveDateFrom: '2025-01-01',
        effectiveDateTo:   '2025-06-30',
        expiryDateFrom:    '2025-07-01',
        expiryDateTo:      '2026-06-30'
      });
      expect(component.form.get('effectiveDateFrom')?.value).toEqual(new Date('2025-01-01'));
      expect(component.form.get('effectiveDateTo')?.value).toEqual(new Date('2025-06-30'));
      expect(component.form.get('expiryDateFrom')?.value).toEqual(new Date('2025-07-01'));
      expect(component.form.get('expiryDateTo')?.value).toEqual(new Date('2026-06-30'));
    });
  });

  describe('debounced store update', () => {
    it('calls store.updateFilters after debounce with mapped filter', fakeAsync(async () => {
      await setup();
      component.form.patchValue({ search: 'Lee' });
      tick(400);
      expect(storeSpy.updateFilters).toHaveBeenCalledWith(
        jasmine.objectContaining({ search: 'Lee' })
      );
    }));

    it('does not call store.updateFilters before debounce fires', fakeAsync(async () => {
      await setup();
      component.form.patchValue({ search: 'L' });
      tick(100);
      expect(storeSpy.updateFilters).not.toHaveBeenCalled();
      tick(300); // total 400ms
    }));
  });
});
