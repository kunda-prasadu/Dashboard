/**
 * ErrorStateComponent tests
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ErrorStateComponent } from './error-state.component';

describe('ErrorStateComponent', () => {
  let fixture: ComponentFixture<ErrorStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorStateComponent, NoopAnimationsModule],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorStateComponent);
    fixture.detectChanges();
  });

  it('renders role="alert" container', () => {
    const el = fixture.nativeElement.querySelector('[role="alert"]');
    expect(el).toBeTruthy();
  });

  it('displays the default message', () => {
    const msg = fixture.nativeElement.querySelector('.error-message') as HTMLElement;
    expect(msg.textContent).toContain('An unexpected error occurred.');
  });

  it('displays a custom error message when provided', async () => {
    fixture.componentRef.setInput('message', 'Service unavailable. Please try later.');
    fixture.detectChanges();
    const msg = fixture.nativeElement.querySelector('.error-message') as HTMLElement;
    expect(msg.textContent).toContain('Service unavailable');
  });

  it('emits retry when the Try again button is clicked', () => {
    const retrySpy = jasmine.createSpy('retry');
    fixture.componentInstance.retry.subscribe(retrySpy);

    const btn = fixture.nativeElement.querySelector('.retry-btn') as HTMLButtonElement;
    btn.click();

    expect(retrySpy).toHaveBeenCalled();
  });

  it('has an accessible label on the retry button', () => {
    const btn = fixture.nativeElement.querySelector('.retry-btn') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBeTruthy();
  });
});
