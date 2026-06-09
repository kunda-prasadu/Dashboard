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
