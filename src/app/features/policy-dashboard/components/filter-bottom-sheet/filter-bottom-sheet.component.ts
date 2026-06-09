import {
  ChangeDetectionStrategy,
  Component,
  inject
} from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef
} from '@angular/material/bottom-sheet';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { PolicyStatus, LineOfBusiness, Region } from '../../models/policy.model';

export interface FilterBottomSheetData {
  form: FormGroup;
  statuses: readonly PolicyStatus[];
  linesOfBusiness: readonly LineOfBusiness[];
  regions: readonly Region[];
}

@Component({
  selector: 'app-filter-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDividerModule
  ],
  templateUrl: './filter-bottom-sheet.component.html',
  styleUrl:    './filter-bottom-sheet.component.scss'
})
export class FilterBottomSheetComponent {
  readonly data       = inject<FilterBottomSheetData>(MAT_BOTTOM_SHEET_DATA);
  readonly sheetRef   = inject(MatBottomSheetRef<FilterBottomSheetComponent>);

  get form(): FormGroup { return this.data.form; }

  clearAll(): void {
    this.form.patchValue({
      statuses: [], linesOfBusiness: [], regions: [],
      premiumMin: null,
      effectiveDateFrom: null, effectiveDateTo: null,
      expiryDateFrom: null,   expiryDateTo: null
    });
  }

  apply(): void {
    this.sheetRef.dismiss();
  }
}
