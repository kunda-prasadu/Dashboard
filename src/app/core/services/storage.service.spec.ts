/**
 * StorageService tests
 *
 * Strategy: Test the service directly (no component/fixture needed).
 * Use a real localStorage (available in ChromeHeadless).
 * SSR guard is tested by substituting BROWSER_ID with a server-side token.
 *
 * Tests cover:
 *   - get / set / remove round-trip
 *   - get returns null when key missing
 *   - remove clears the key
 *   - type-safe generic get<T>
 *   - graceful null return when JSON is malformed
 *   - SSR guard: all methods are no-ops when isPlatformBrowser is false
 */
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { StorageService } from './storage.service';

const TEST_KEY = 'ph-test-storage-service';

describe('StorageService', () => {
  let service: StorageService;

  function setup(platformId: string = 'browser') {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        StorageService,
        { provide: PLATFORM_ID, useValue: platformId },
      ],
    });
    service = TestBed.inject(StorageService);
  }

  afterEach(() => {
    try { localStorage.removeItem(TEST_KEY); } catch { /* noop */ }
    TestBed.resetTestingModule();
  });

  // ── get / set ────────────────────────────────────────────────────────────

  it('stores and retrieves a string value', () => {
    setup();
    service.set(TEST_KEY, 'hello');
    expect(service.get<string>(TEST_KEY)).toBe('hello');
  });

  it('stores and retrieves a number value', () => {
    setup();
    service.set(TEST_KEY, 42);
    expect(service.get<number>(TEST_KEY)).toBe(42);
  });

  it('stores and retrieves an object value', () => {
    setup();
    const obj = { statuses: ['Active', 'Expired'], page: 2 };
    service.set(TEST_KEY, obj);
    expect(service.get<typeof obj>(TEST_KEY)).toEqual(obj);
  });

  it('returns null when key is absent', () => {
    setup();
    expect(service.get('ph-nonexistent-key')).toBeNull();
  });

  // ── remove ───────────────────────────────────────────────────────────────

  it('removes a key so subsequent get returns null', () => {
    setup();
    service.set(TEST_KEY, true);
    service.remove(TEST_KEY);
    expect(service.get(TEST_KEY)).toBeNull();
  });

  it('remove on absent key does not throw', () => {
    setup();
    expect(() => service.remove('ph-never-set')).not.toThrow();
  });

  // ── malformed JSON ───────────────────────────────────────────────────────

  it('returns null when the stored value is not valid JSON', () => {
    setup();
    localStorage.setItem(TEST_KEY, '{not valid json');
    expect(service.get(TEST_KEY)).toBeNull();
  });

  // ── SSR guard ────────────────────────────────────────────────────────────

  it('get returns null on the server platform', () => {
    setup('server');
    // Nothing was stored (server env) — should not touch localStorage
    expect(service.get(TEST_KEY)).toBeNull();
  });

  it('set is a no-op on the server platform', () => {
    setup('server');
    service.set(TEST_KEY, 'should-not-persist');
    // Switch to browser to verify nothing was written
    TestBed.resetTestingModule();
    setup('browser');
    expect(service.get(TEST_KEY)).toBeNull();
  });

  it('remove is a no-op on the server platform and does not throw', () => {
    setup('server');
    expect(() => service.remove(TEST_KEY)).not.toThrow();
  });
});
