/**
 * LoggerService
 *
 * What: A thin wrapper around console.* that prefixes every message with [PolicyHub]
 * and suppresses debug/info output in production builds.
 *
 * Why: Centralises log control so we can swap the implementation (e.g., send errors
 * to a remote logging service) without touching every call site. Also prevents
 * accidental verbose output reaching production users.
 *
 * SSR safety: Checks isPlatformBrowser before writing to console, because the
 * server-side renderer runs in Node where certain console interactions may differ.
 */
import { inject, Injectable, isDevMode, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const PREFIX = '[PolicyHub]';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly dev = isDevMode();

  debug(message: string, ...args: unknown[]): void {
    if (this.dev && this.isBrowser) console.debug(PREFIX, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    if (this.dev && this.isBrowser) console.info(PREFIX, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.isBrowser) console.warn(PREFIX, message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    if (this.isBrowser) console.error(PREFIX, message, ...args);
  }
}
