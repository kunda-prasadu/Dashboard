/**
 * ThemeService
 *
 * What: Manages the application's light/dark theme as a signal-based singleton.
 * Exposes `isDark`, `toggle()`, and `setDark()`. An Angular `effect()` mirrors
 * the signal state onto `document.documentElement` as the `dark-theme` CSS class,
 * which CSS custom-property overrides in styles.scss react to.
 *
 * Why class-toggle instead of `color-scheme` property:
 * Material 3's generated CSS variables are scoped to selectors, not to the native
 * `color-scheme` property. A class on `<html>` gives us a single toggle point that
 * works with both Material tokens and our own custom properties.
 *
 * Init priority (first truthy wins):
 *   1. Value stored in localStorage via StorageService
 *   2. `prefers-color-scheme: dark` media query
 *   3. Light (default)
 *
 * Why StorageService (not direct localStorage):
 * StorageService is the declared single point of contact for localStorage throughout
 * the app. Direct calls would break the encapsulation contract enforced in Phase 7.
 */
import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from '../../features/policy-dashboard/constants/policy.constants';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage    = inject(StorageService);
  private readonly isBrowser  = isPlatformBrowser(inject(PLATFORM_ID));

  readonly isDark = signal<boolean>(this.resolveInitialTheme());

  constructor() {
    // Mirror isDark onto <html class="dark-theme"> on every change
    effect(() => {
      if (!this.isBrowser) return;
      document.documentElement.classList.toggle('dark-theme', this.isDark());
    });
  }

  toggle(): void {
    this.setDark(!this.isDark());
  }

  setDark(dark: boolean): void {
    this.isDark.set(dark);
    this.storage.set(STORAGE_KEYS.THEME, dark);
  }

  private resolveInitialTheme(): boolean {
    // 1. Persisted user preference
    const stored = this.storage.get<boolean>(STORAGE_KEYS.THEME);
    if (stored !== null) return stored;

    // 2. OS / browser preference
    if (this.isBrowser) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // 3. Default: light
    return false;
  }
}
