/**
 * ThemeService tests
 *
 * Strategy: Stub StorageService so tests don't touch real localStorage.
 * Provide a browser PLATFORM_ID so isPlatformBrowser returns true.
 * We cannot directly test DOM class changes from an effect() in a headless
 * test without a DOM fixture — instead we test the signal values and
 * verify StorageService.set is called with the correct arguments.
 *
 * Tests cover:
 *   - toggle() flips isDark
 *   - setDark(true/false) sets isDark and persists via StorageService
 *   - init: stored value (true) wins over system preference
 *   - init: stored value (false) wins over system preference
 *   - init: system prefers-dark when nothing stored
 *   - init: defaults to light when nothing stored and no system preference
 *   - SSR: resolves to false without calling matchMedia
 */
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { ThemeService } from './theme.service';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from '../../features/policy-dashboard/constants/policy.constants';

function makeStorage(stored: boolean | null = null): jasmine.SpyObj<StorageService> {
  const spy = jasmine.createSpyObj<StorageService>('StorageService', ['get', 'set', 'remove']);
  spy.get.and.returnValue(stored as any);
  return spy;
}

function buildService(opts: {
  stored?: boolean | null;
  prefersDark?: boolean;
  platform?: string;
} = {}): ThemeService {
  const { stored = null, prefersDark = false, platform = 'browser' } = opts;

  // Stub window.matchMedia before service construction
  if (platform === 'browser') {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: prefersDark,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList);
  }

  const storage = makeStorage(stored);

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      ThemeService,
      { provide: StorageService, useValue: storage },
      { provide: PLATFORM_ID, useValue: platform },
    ],
  });

  return TestBed.inject(ThemeService);
}

describe('ThemeService', () => {
  afterEach(() => TestBed.resetTestingModule());

  // ── toggle ───────────────────────────────────────────────────────────────

  it('toggle() flips isDark from false to true', () => {
    const svc = buildService({ stored: false });
    expect(svc.isDark()).toBeFalse();
    svc.toggle();
    expect(svc.isDark()).toBeTrue();
  });

  it('toggle() flips isDark from true to false', () => {
    const svc = buildService({ stored: true });
    expect(svc.isDark()).toBeTrue();
    svc.toggle();
    expect(svc.isDark()).toBeFalse();
  });

  // ── setDark ──────────────────────────────────────────────────────────────

  it('setDark(true) sets isDark signal to true and persists', () => {
    const svc = buildService({ stored: false });
    const storage = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;

    svc.setDark(true);

    expect(svc.isDark()).toBeTrue();
    expect(storage.set).toHaveBeenCalledWith(STORAGE_KEYS.THEME, true);
  });

  it('setDark(false) sets isDark signal to false and persists', () => {
    const svc = buildService({ stored: true });
    const storage = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;

    svc.setDark(false);

    expect(svc.isDark()).toBeFalse();
    expect(storage.set).toHaveBeenCalledWith(STORAGE_KEYS.THEME, false);
  });

  // ── init: stored value wins ───────────────────────────────────────────────

  it('initialises to true when stored value is true (overrides system pref)', () => {
    const svc = buildService({ stored: true, prefersDark: false });
    expect(svc.isDark()).toBeTrue();
  });

  it('initialises to false when stored value is false (overrides system pref)', () => {
    const svc = buildService({ stored: false, prefersDark: true });
    expect(svc.isDark()).toBeFalse();
  });

  // ── init: system preference ───────────────────────────────────────────────

  it('initialises to true when no stored value and system prefers dark', () => {
    const svc = buildService({ stored: null, prefersDark: true });
    expect(svc.isDark()).toBeTrue();
  });

  it('initialises to false when no stored value and system prefers light', () => {
    const svc = buildService({ stored: null, prefersDark: false });
    expect(svc.isDark()).toBeFalse();
  });

  // ── SSR guard ─────────────────────────────────────────────────────────────

  it('initialises to false on server platform without calling matchMedia', () => {
    const matchMediaSpy = spyOn(window, 'matchMedia');
    const svc = buildService({ stored: null, platform: 'server' });
    expect(svc.isDark()).toBeFalse();
    expect(matchMediaSpy).not.toHaveBeenCalled();
  });
});
