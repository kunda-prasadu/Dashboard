import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ThemePickerComponent } from './theme-picker.component';
import { ThemeService } from '../../core/services/theme.service';

describe('ThemePickerComponent', () => {
  let fixture: ComponentFixture<ThemePickerComponent>;
  const isDarkSignal = signal(false);
  const toggleSpy    = jasmine.createSpy('toggle');

  const themeStub = { isDark: isDarkSignal, toggle: toggleSpy };

  beforeEach(async () => {
    isDarkSignal.set(false);
    toggleSpy.calls.reset();

    await TestBed.configureTestingModule({
      imports: [ThemePickerComponent, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ThemeService, useValue: themeStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemePickerComponent);
    fixture.detectChanges();
  });

  // ── Icon ──────────────────────────────────────────────────────────────────

  it('shows dark_mode icon when theme is light', () => {
    const icon = fixture.nativeElement.querySelector('mat-icon') as HTMLElement;
    expect(icon.textContent?.trim()).toBe('dark_mode');
  });

  it('shows light_mode icon when theme is dark', () => {
    isDarkSignal.set(true);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('mat-icon') as HTMLElement;
    expect(icon.textContent?.trim()).toBe('light_mode');
  });

  // ── ARIA attributes ───────────────────────────────────────────────────────

  it('sets aria-checked="false" when theme is light', () => {
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.getAttribute('aria-checked')).toBe('false');
  });

  it('sets aria-checked="true" when theme is dark', () => {
    isDarkSignal.set(true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.getAttribute('aria-checked')).toBe('true');
  });

  it('aria-label says "Switch to dark theme" when in light mode', () => {
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Switch to dark theme');
  });

  it('aria-label says "Switch to light theme" when in dark mode', () => {
    isDarkSignal.set(true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Switch to light theme');
  });

  it('has role="switch" on the button', () => {
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.getAttribute('role')).toBe('switch');
  });

  // ── Interaction ───────────────────────────────────────────────────────────

  it('calls theme.toggle() when the button is clicked', () => {
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(toggleSpy).toHaveBeenCalledOnceWith();
  });

  it('reflects signal update without re-creating the component', () => {
    isDarkSignal.set(true);
    fixture.detectChanges();
    isDarkSignal.set(false);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('mat-icon') as HTMLElement;
    expect(icon.textContent?.trim()).toBe('dark_mode');
  });
});
