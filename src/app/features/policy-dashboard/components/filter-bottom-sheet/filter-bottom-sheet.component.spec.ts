import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';

import { FilterBottomSheetComponent } from './filter-bottom-sheet.component';
import { POLICY_STATUSES, LINES_OF_BUSINESS, REGIONS } from '../../constants/policy.constants';

describe('FilterBottomSheetComponent', () => {
  let fixture: ComponentFixture<FilterBottomSheetComponent>;
  let component: FilterBottomSheetComponent;
  let sheetRefSpy: jasmine.SpyObj<MatBottomSheetRef<FilterBottomSheetComponent>>;

  async function setup() {
    sheetRefSpy = jasmine.createSpyObj('MatBottomSheetRef', ['dismiss']);

    const fb = new FormBuilder();
    const form = fb.group({
      search:            [''],
      statuses:          [['Active', 'Pending']],
      linesOfBusiness:   [['Marine']],
      regions:           [['Singapore']],
      premiumMin:        [5000],
      effectiveDateFrom: [null],
      effectiveDateTo:   [null],
      expiryDateFrom:    [null],
      expiryDateTo:      [null]
    });

    await TestBed.configureTestingModule({
      imports: [FilterBottomSheetComponent, NoopAnimationsModule, ReactiveFormsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatBottomSheetRef, useValue: sheetRefSpy },
        {
          provide: MAT_BOTTOM_SHEET_DATA,
          useValue: {
            form,
            statuses:        POLICY_STATUSES,
            linesOfBusiness: LINES_OF_BUSINESS,
            regions:         REGIONS
          }
        }
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(FilterBottomSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('exposes the form from injected data', async () => {
    await setup();
    expect(component.form).toBeTruthy();
    expect(component.form.get('statuses')?.value).toEqual(['Active', 'Pending']);
  });

  it('apply() calls sheetRef.dismiss()', async () => {
    await setup();
    component.apply();
    expect(sheetRefSpy.dismiss).toHaveBeenCalled();
  });

  describe('clearAll()', () => {
    it('resets all filter fields except search to empty/null', async () => {
      await setup();
      component.clearAll();
      expect(component.form.get('statuses')?.value).toEqual([]);
      expect(component.form.get('linesOfBusiness')?.value).toEqual([]);
      expect(component.form.get('regions')?.value).toEqual([]);
      expect(component.form.get('premiumMin')?.value).toBeNull();
      expect(component.form.get('effectiveDateFrom')?.value).toBeNull();
      expect(component.form.get('effectiveDateTo')?.value).toBeNull();
      expect(component.form.get('expiryDateFrom')?.value).toBeNull();
      expect(component.form.get('expiryDateTo')?.value).toBeNull();
    });

    it('does not clear the search field', async () => {
      await setup();
      component.form.patchValue({ search: 'POL-001' });
      component.clearAll();
      expect(component.form.get('search')?.value).toBe('POL-001');
    });
  });

  it('renders status options from injected data', async () => {
    await setup();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('All Filters');
  });
});
