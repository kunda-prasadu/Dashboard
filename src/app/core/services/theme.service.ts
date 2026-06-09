import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from '../../features/policy-dashboard/constants/policy.constants';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage   = inject(StorageService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly isDark       = signal<boolean>(this.resolveInitialDark());
  readonly activePalette = signal<string>(this.resolveInitialPalette());

  constructor() {
    effect(() => {
      if (!this.isBrowser) return;
      document.documentElement.classList.toggle('dark-theme', this.isDark());
    });

    effect(() => {
      if (!this.isBrowser) return;
      const palette = this.activePalette();
      // Remove any previous palette-* class
      Array.from(document.documentElement.classList)
        .filter(c => c.startsWith('palette-'))
        .forEach(c => document.documentElement.classList.remove(c));
      document.documentElement.classList.add(`palette-${palette}`);
    });
  }

  toggle(): void { this.setDark(!this.isDark()); }

  setDark(dark: boolean): void {
    this.isDark.set(dark);
    this.storage.set(STORAGE_KEYS.THEME, dark);
  }

  setPalette(id: string): void {
    this.activePalette.set(id);
    this.storage.set(STORAGE_KEYS.PALETTE, id);
  }

  private resolveInitialDark(): boolean {
    const stored = this.storage.get<boolean>(STORAGE_KEYS.THEME);
    if (stored !== null) return stored;
    if (this.isBrowser) return window.matchMedia('(prefers-color-scheme: dark)').matches;
    return false;
  }

  private resolveInitialPalette(): string {
    return this.storage.get<string>(STORAGE_KEYS.PALETTE) ?? 'azure';
  }
}
