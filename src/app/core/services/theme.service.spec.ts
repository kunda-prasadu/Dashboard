import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { ThemeService } from './theme.service';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from '../../features/policy-dashboard/constants/policy.constants';

function makeStorage(opts: { dark?: boolean | null; palette?: string | null } = {}): jasmine.SpyObj<StorageService> {
  const spy = jasmine.createSpyObj<StorageService>('StorageService', ['get', 'set', 'remove']);
  spy.get.and.callFake(<T>(key: string): T | null => {
    if (key === STORAGE_KEYS.THEME)   return (opts.dark   ?? null) as T | null;
    if (key === STORAGE_KEYS.PALETTE) return (opts.palette ?? null) as T | null;
    return null;
  });
  return spy;
}

function buildService(opts: {
  dark?: boolean | null;
  palette?: string | null;
  prefersDark?: boolean;
  platform?: string;
} = {}): ThemeService {
  const { dark = null, palette = null, prefersDark = false, platform = 'browser' } = opts;

  if (platform === 'browser') {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: prefersDark,
      media: '',
      onchange: null,
      addListener:    () => {},
      removeListener: () => {},
      addEventListener:    () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList);
  }

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      ThemeService,
      { provide: StorageService, useValue: makeStorage({ dark, palette }) },
      { provide: PLATFORM_ID, useValue: platform },
    ],
  });

  return TestBed.inject(ThemeService);
}

describe('ThemeService', () => {
  afterEach(() => {
    // Clean up any palette-* or dark-theme classes added to <html> by effects
    document.documentElement.classList.remove('dark-theme');
    Array.from(document.documentElement.classList)
      .filter(c => c.startsWith('palette-'))
      .forEach(c => document.documentElement.classList.remove(c));
    TestBed.resetTestingModule();
  });

  // ── isDark: toggle ──────────────────────────────────────────────────────────

  describe('toggle()', () => {
    it('flips isDark from false to true', () => {
      const svc = buildService({ dark: false });
      svc.toggle();
      expect(svc.isDark()).toBeTrue();
    });

    it('flips isDark from true to false', () => {
      const svc = buildService({ dark: true });
      svc.toggle();
      expect(svc.isDark()).toBeFalse();
    });
  });

  // ── isDark: setDark ─────────────────────────────────────────────────────────

  describe('setDark()', () => {
    it('sets isDark signal to true and persists to storage', () => {
      const svc     = buildService({ dark: false });
      const storage = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;
      svc.setDark(true);
      expect(svc.isDark()).toBeTrue();
      expect(storage.set).toHaveBeenCalledWith(STORAGE_KEYS.THEME, true);
    });

    it('sets isDark signal to false and persists to storage', () => {
      const svc     = buildService({ dark: true });
      const storage = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;
      svc.setDark(false);
      expect(svc.isDark()).toBeFalse();
      expect(storage.set).toHaveBeenCalledWith(STORAGE_KEYS.THEME, false);
    });

    it('adds dark-theme class to <html> when set to true', () => {
      const svc = buildService({ dark: false });
      svc.setDark(true);
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('dark-theme')).toBeTrue();
    });

    it('removes dark-theme class from <html> when set to false', () => {
      document.documentElement.classList.add('dark-theme');
      const svc = buildService({ dark: true });
      svc.setDark(false);
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('dark-theme')).toBeFalse();
    });
  });

  // ── isDark: initialisation priority ─────────────────────────────────────────

  describe('isDark initialisation', () => {
    it('uses stored true even when system prefers light', () => {
      expect(buildService({ dark: true, prefersDark: false }).isDark()).toBeTrue();
    });

    it('uses stored false even when system prefers dark', () => {
      expect(buildService({ dark: false, prefersDark: true }).isDark()).toBeFalse();
    });

    it('falls back to system preference (dark) when nothing is stored', () => {
      expect(buildService({ dark: null, prefersDark: true }).isDark()).toBeTrue();
    });

    it('falls back to light when nothing is stored and system prefers light', () => {
      expect(buildService({ dark: null, prefersDark: false }).isDark()).toBeFalse();
    });

    it('defaults to false on server platform without calling matchMedia', () => {
      const mMediaSpy = spyOn(window, 'matchMedia');
      const svc = buildService({ dark: null, platform: 'server' });
      expect(svc.isDark()).toBeFalse();
      expect(mMediaSpy).not.toHaveBeenCalled();
    });
  });

  // ── activePalette: initialisation ───────────────────────────────────────────

  describe('activePalette initialisation', () => {
    it('defaults to "azure" when no palette is stored', () => {
      expect(buildService({ palette: null }).activePalette()).toBe('azure');
    });

    it('uses the stored palette id when present', () => {
      expect(buildService({ palette: 'forest' }).activePalette()).toBe('forest');
    });

    it('applies palette-azure class to <html> on first render', () => {
      buildService({ palette: null });
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('palette-azure')).toBeTrue();
    });

    it('applies stored palette class to <html> on first render', () => {
      buildService({ palette: 'violet' });
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('palette-violet')).toBeTrue();
    });
  });

  // ── setPalette ──────────────────────────────────────────────────────────────

  describe('setPalette()', () => {
    it('updates activePalette signal', () => {
      const svc = buildService({ palette: 'azure' });
      svc.setPalette('crimson');
      expect(svc.activePalette()).toBe('crimson');
    });

    it('persists the new palette id to storage', () => {
      const svc     = buildService({ palette: 'azure' });
      const storage = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;
      svc.setPalette('rose');
      expect(storage.set).toHaveBeenCalledWith(STORAGE_KEYS.PALETTE, 'rose');
    });

    it('adds the new palette-* class to <html>', () => {
      const svc = buildService({ palette: 'azure' });
      svc.setPalette('teal');
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('palette-teal')).toBeTrue();
    });

    it('removes the previous palette-* class when switching palettes', () => {
      const svc = buildService({ palette: 'azure' });
      TestBed.flushEffects();
      svc.setPalette('indigo');
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('palette-azure')).toBeFalse();
      expect(document.documentElement.classList.contains('palette-indigo')).toBeTrue();
    });

    it('only ever has one palette-* class on <html> at a time', () => {
      const svc = buildService({ palette: 'azure' });
      svc.setPalette('forest');
      svc.setPalette('amber');
      svc.setPalette('violet');
      TestBed.flushEffects();
      const paletteClasses = Array.from(document.documentElement.classList)
        .filter(c => c.startsWith('palette-'));
      expect(paletteClasses.length).toBe(1);
      expect(paletteClasses[0]).toBe('palette-violet');
    });

    it('does not affect isDark when called', () => {
      const svc = buildService({ dark: false, palette: 'azure' });
      svc.setPalette('rose');
      expect(svc.isDark()).toBeFalse();
    });
  });

  // ── combined: dark + palette ────────────────────────────────────────────────

  describe('dark + palette independence', () => {
    it('dark-theme and palette-* classes coexist on <html>', () => {
      const svc = buildService({ dark: false, palette: 'azure' });
      svc.setDark(true);
      svc.setPalette('forest');
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('dark-theme')).toBeTrue();
      expect(document.documentElement.classList.contains('palette-forest')).toBeTrue();
    });

    it('toggling dark does not change activePalette', () => {
      const svc = buildService({ dark: false, palette: 'crimson' });
      svc.toggle();
      expect(svc.activePalette()).toBe('crimson');
    });
  });
});
