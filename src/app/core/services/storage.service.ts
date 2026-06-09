/**
 * StorageService
 *
 * What: SSR-safe wrapper around localStorage. Serialises/deserialises JSON values
 * and catches storage errors (private browsing, quota exceeded) silently.
 *
 * Why: Components and stores should not call localStorage directly — it throws in
 * SSR (no window) and in some private-browsing environments. Centralising here lets
 * us swap the backing store (e.g., sessionStorage, IndexedDB) without touching callers.
 */
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly ok = isPlatformBrowser(inject(PLATFORM_ID));

  get<T>(key: string): T | null {
    if (!this.ok) return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  set(key: string, value: unknown): void {
    if (!this.ok) return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
  }

  remove(key: string): void {
    if (!this.ok) return;
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }
}
