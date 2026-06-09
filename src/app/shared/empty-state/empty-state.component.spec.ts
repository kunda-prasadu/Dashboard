/**
 * EmptyStateComponent tests
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent, NoopAnimationsModule],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.detectChanges();
  });

  it('renders role="status" container', () => {
    const el = fixture.nativeElement.querySelector('[role="status"]');
    expect(el).toBeTruthy();
  });

  it('displays the default message', () => {
    const msg = fixture.nativeElement.querySelector('.empty-message') as HTMLElement;
    expect(msg.textContent).toContain('No policies match your filters');
  });

  it('displays a custom message when provided', async () => {
    fixture.componentRef.setInput('message', 'Try a different region.');
    fixture.detectChanges();
    const msg = fixture.nativeElement.querySelector('.empty-message') as HTMLElement;
    expect(msg.textContent).toContain('Try a different region.');
  });

  it('emits clearFilters when the Clear button is clicked', () => {
    const clearSpy = jasmine.createSpy('clearFilters');
    fixture.componentInstance.clearFilters.subscribe(clearSpy);

    const btn = fixture.nativeElement.querySelector('.clear-btn') as HTMLButtonElement;
    btn.click();

    expect(clearSpy).toHaveBeenCalled();
  });

  it('has an accessible label on the clear button', () => {
    const btn = fixture.nativeElement.querySelector('.clear-btn') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBeTruthy();
  });
});
