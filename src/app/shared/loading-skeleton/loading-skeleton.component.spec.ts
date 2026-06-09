/**
 * LoadingSkeletonComponent tests
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { LoadingSkeletonComponent } from './loading-skeleton.component';

describe('LoadingSkeletonComponent', () => {
  let fixture: ComponentFixture<LoadingSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSkeletonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingSkeletonComponent);
    fixture.detectChanges();
  });

  it('renders with role="status" and aria-busy="true"', () => {
    const el = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('renders 4 status card skeletons', () => {
    const cards = fixture.nativeElement.querySelectorAll('.skeleton-card');
    expect(cards.length).toBe(4);
  });

  it('renders 8 table row skeletons', () => {
    const rows = fixture.nativeElement.querySelectorAll('.skeleton-row');
    expect(rows.length).toBe(8);
  });

  it('renders the filter bar skeleton', () => {
    const filter = fixture.nativeElement.querySelector('.skeleton-filter-bar');
    expect(filter).toBeTruthy();
  });

  it('renders a screen-reader text node', () => {
    const sr = fixture.nativeElement.querySelector('.sr-only');
    expect(sr?.textContent?.trim()).toBeTruthy();
  });
});
