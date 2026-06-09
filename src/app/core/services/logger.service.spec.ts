import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  function build(platform = 'browser'): LoggerService {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        LoggerService,
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    return TestBed.inject(LoggerService);
  }

  afterEach(() => TestBed.resetTestingModule());

  // ── Browser (dev mode — default in Karma) ────────────────────────────────

  it('debug() calls console.debug with [PolicyHub] prefix', () => {
    const spy = spyOn(console, 'debug');
    build().debug('msg', 42);
    expect(spy).toHaveBeenCalledWith('[PolicyHub]', 'msg', 42);
  });

  it('info() calls console.info with [PolicyHub] prefix', () => {
    const spy = spyOn(console, 'info');
    build().info('hello');
    expect(spy).toHaveBeenCalledWith('[PolicyHub]', 'hello');
  });

  it('warn() calls console.warn in browser (not dev-only)', () => {
    const spy = spyOn(console, 'warn');
    build().warn('heads up', { code: 1 });
    expect(spy).toHaveBeenCalledWith('[PolicyHub]', 'heads up', { code: 1 });
  });

  it('error() calls console.error in browser (not dev-only)', () => {
    const spy = spyOn(console, 'error');
    build().error('boom');
    expect(spy).toHaveBeenCalledWith('[PolicyHub]', 'boom');
  });

  it('debug() forwards extra spread args to console', () => {
    const spy = spyOn(console, 'debug');
    build().debug('trace', 'a', 'b', 'c');
    expect(spy).toHaveBeenCalledWith('[PolicyHub]', 'trace', 'a', 'b', 'c');
  });

  // ── Server platform (SSR guard) ───────────────────────────────────────────
  // Angular emits its own console.warn (NG0914) during TestBed init, so we
  // assert on the [PolicyHub] prefix rather than "never called".

  it('warn() does not emit [PolicyHub] messages on server platform', () => {
    const spy = spyOn(console, 'warn');
    build('server').warn('should not print');
    expect(spy).not.toHaveBeenCalledWith('[PolicyHub]', jasmine.anything());
  });

  it('error() does not emit [PolicyHub] messages on server platform', () => {
    const spy = spyOn(console, 'error');
    build('server').error('should not print');
    expect(spy).not.toHaveBeenCalledWith('[PolicyHub]', jasmine.anything());
  });

  it('debug() does not emit [PolicyHub] messages on server platform', () => {
    const spy = spyOn(console, 'debug');
    build('server').debug('should not print');
    expect(spy).not.toHaveBeenCalledWith('[PolicyHub]', jasmine.anything());
  });

  it('info() does not emit [PolicyHub] messages on server platform', () => {
    const spy = spyOn(console, 'info');
    build('server').info('should not print');
    expect(spy).not.toHaveBeenCalledWith('[PolicyHub]', jasmine.anything());
  });
});
