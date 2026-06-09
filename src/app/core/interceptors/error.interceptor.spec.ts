import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { errorInterceptor, NormalisedHttpError } from './error.interceptor';
import { LoggerService } from '../services/logger.service';

const loggerStub: Partial<LoggerService> = {
  error: jasmine.createSpy('error'),
  warn:  jasmine.createSpy('warn'),
  debug: jasmine.createSpy('debug'),
  info:  jasmine.createSpy('info'),
};

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    (loggerStub.error as jasmine.Spy).calls.reset();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: LoggerService, useValue: loggerStub },
      ],
    });

    http     = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); TestBed.resetTestingModule(); });

  // ── Helper ────────────────────────────────────────────────────────────────

  function flushError(status: number): NormalisedHttpError {
    let caught!: NormalisedHttpError;
    http.get('/api/test').subscribe({ error: e => { caught = e as NormalisedHttpError; } });
    httpMock.expectOne('/api/test').flush({ error: 'x' }, { status, statusText: 'Err' });
    return caught;
  }

  // ── Status-specific messages ──────────────────────────────────────────────

  it('maps status 0 (network error) to a server-unreachable message', () => {
    let caught!: NormalisedHttpError;
    http.get('/api/test').subscribe({ error: e => { caught = e as NormalisedHttpError; } });
    httpMock.expectOne('/api/test').error(new ProgressEvent('error'));
    expect(caught.status).toBe(0);
    expect(caught.message).toContain('server');
  });

  it('maps 401 to a session-expired message', () => {
    const e = flushError(401);
    expect(e.status).toBe(401);
    expect(e.message).toContain('session');
  });

  it('maps 403 to a permission-denied message', () => {
    const e = flushError(403);
    expect(e.status).toBe(403);
    expect(e.message).toContain('permission');
  });

  it('maps 404 to a not-found message', () => {
    const e = flushError(404);
    expect(e.status).toBe(404);
    expect(e.message).toContain('not found');
  });

  it('maps 400 to an invalid-request message', () => {
    const e = flushError(400);
    expect(e.status).toBe(400);
    expect(e.message).toContain('Invalid request');
  });

  it('maps 422 (other 4xx) to an invalid-request message', () => {
    const e = flushError(422);
    expect(e.status).toBe(422);
    expect(e.message).toContain('Invalid request');
  });

  it('maps 500 to a server-error message', () => {
    const e = flushError(500);
    expect(e.status).toBe(500);
    expect(e.message).toContain('server error');
  });

  // ── NormalisedHttpError shape ─────────────────────────────────────────────

  it('attaches the originalError HttpErrorResponse', () => {
    const e = flushError(404);
    expect(e.originalError).toBeDefined();
    expect(e.originalError.status).toBe(404);
  });

  // ── Logger call ───────────────────────────────────────────────────────────

  it('calls logger.error with method and URL in the first argument', () => {
    flushError(500);
    expect(loggerStub.error as jasmine.Spy).toHaveBeenCalledWith(
      jasmine.stringContaining('GET /api/test'),
      jasmine.anything()
    );
  });

  // ── Happy path passes through ─────────────────────────────────────────────

  it('does not intercept successful responses', () => {
    let result: unknown;
    http.get('/api/test').subscribe({ next: r => { result = r; } });
    httpMock.expectOne('/api/test').flush({ data: 'ok' });
    expect(result).toEqual({ data: 'ok' });
  });
});
