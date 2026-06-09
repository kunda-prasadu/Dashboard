import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ThemeService } from '../../core/services/theme.service';
import { THEME_PALETTES } from './theme-palette.constants';

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule, MatMenuModule],
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="themeMenu"
      matTooltip="Customize theme"
      aria-label="Customize theme"
      aria-haspopup="true"
    >
      <mat-icon aria-hidden="true">palette</mat-icon>
    </button>

    <mat-menu #themeMenu="matMenu" class="theme-picker-menu">
      <div class="theme-menu-inner" (click)="$event.stopPropagation()">

        <!-- Appearance: Light / Dark -->
        <p class="menu-section-label">APPEARANCE</p>
        <div class="appearance-row">
          <button
            mat-stroked-button
            class="appearance-btn"
            [class.active]="!theme.isDark()"
            (click)="theme.setDark(false)"
            aria-label="Light mode"
          >
            <mat-icon aria-hidden="true">light_mode</mat-icon>
            Light
          </button>
          <button
            mat-stroked-button
            class="appearance-btn"
            [class.active]="theme.isDark()"
            (click)="theme.setDark(true)"
            aria-label="Dark mode"
          >
            <mat-icon aria-hidden="true">dark_mode</mat-icon>
            Dark
          </button>
        </div>

        <!-- Color palette swatches -->
        <p class="menu-section-label">COLOR PALETTE</p>
        <div class="swatch-grid" role="listbox" aria-label="Color palette">
          @for (p of palettes; track p.id) {
            <button
              class="swatch-btn"
              role="option"
              [class.selected]="theme.activePalette() === p.id"
              [style.background]="p.swatch"
              [matTooltip]="p.name"
              [attr.aria-selected]="theme.activePalette() === p.id"
              [attr.aria-label]="p.name"
              (click)="theme.setPalette(p.id)"
            >
              @if (theme.activePalette() === p.id) {
                <mat-icon class="check-icon" aria-hidden="true">check</mat-icon>
              }
            </button>
          }
        </div>

      </div>
    </mat-menu>
  `,
  styles: [`
    .theme-menu-inner {
      padding: 12px 16px 16px;
      min-width: 220px;
    }

    .menu-section-label {
      margin: 12px 0 8px;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--mat-sys-on-surface-variant);

      &:first-child { margin-top: 0; }
    }

    .appearance-row {
      display: flex;
      gap: 8px;
    }

    .appearance-btn {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }

      &.active {
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
        border-color: var(--mat-sys-primary);
      }
    }

    .swatch-grid {
      display: grid;
      grid-template-columns: repeat(5, 32px);
      gap: 8px;
    }

    .swatch-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 100ms ease, border-color 100ms ease;

      &:hover { transform: scale(1.15); }

      &.selected {
        border-color: var(--mat-sys-on-surface);
        transform: scale(1.15);
      }

      .check-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #fff;
        filter: drop-shadow(0 1px 1px rgba(0,0,0,.5));
      }
    }
  `],
})
export class ThemePickerComponent {
  protected readonly theme   = inject(ThemeService);
  protected readonly palettes = THEME_PALETTES;
}
