/**
 * ThemePickerComponent
 *
 * What: A single icon-button that toggles between light and dark themes.
 * Reads ThemeService.isDark() and flips the icon accordingly (light_mode / dark_mode).
 *
 * Why a standalone shared component (not inlined in the toolbar):
 * The toggle is a discrete, testable unit with its own accessibility attributes.
 * Keeping it in `shared/` means it can be placed in any shell without copy-paste.
 *
 * Accessibility:
 * - `role="switch"` + `aria-checked` communicate the current state to screen readers.
 * - `aria-label` is dynamic: "Switch to dark theme" / "Switch to light theme".
 * - Tooltip mirrors the aria-label for sighted keyboard users.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <button
      mat-icon-button
      role="switch"
      [attr.aria-checked]="theme.isDark()"
      [attr.aria-label]="theme.isDark() ? 'Switch to light theme' : 'Switch to dark theme'"
      [matTooltip]="theme.isDark() ? 'Switch to light theme' : 'Switch to dark theme'"
      (click)="theme.toggle()"
    >
      <mat-icon aria-hidden="true">
        {{ theme.isDark() ? 'light_mode' : 'dark_mode' }}
      </mat-icon>
    </button>
  `,
})
export class ThemePickerComponent {
  protected readonly theme = inject(ThemeService);
}
