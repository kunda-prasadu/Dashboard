import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { SummaryPanelComponent } from './summary-panel.component';
import { PolicyStore } from '../../store/policy.store';
import { PolicySummaryData, EMPTY_SUMMARY } from '../../models/policy-summary.model';

function makeSummary(overrides: Partial<PolicySummaryData> = {}): PolicySummaryData {
  return { ...EMPTY_SUMMARY, ...overrides };
}

function makeStoreSpy(summary: PolicySummaryData = EMPTY_SUMMARY) {
  return { summary: signal(summary) };
}

describe('SummaryPanelComponent', () => {
  let fixture: ComponentFixture<SummaryPanelComponent>;
  let component: SummaryPanelComponent;
  let storeSpy: ReturnType<typeof makeStoreSpy>;

  async function setup(summary: PolicySummaryData = EMPTY_SUMMARY) {
    storeSpy = makeStoreSpy(summary);

    await TestBed.configureTestingModule({
      imports: [SummaryPanelComponent, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: PolicyStore, useValue: storeSpy }
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(SummaryPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('status card counts', () => {
    it('displays the correct count for each status', async () => {
      await setup(makeSummary({ active: 42, pending: 10, expired: 7, cancelled: 3 }));
      expect(component.countFor('Active')).toBe(42);
      expect(component.countFor('Pending')).toBe(10);
      expect(component.countFor('Expired')).toBe(7);
      expect(component.countFor('Cancelled')).toBe(3);
    });

    it('totalPolicies sums all four statuses', async () => {
      await setup(makeSummary({ active: 10, pending: 5, expired: 3, cancelled: 2 }));
      expect(component.totalPolicies()).toBe(20);
    });

    it('emits statusClick with the correct status on card click', async () => {
      await setup(makeSummary({ active: 5 }));
      let emitted: string | undefined;
      component.statusClick.subscribe(s => { emitted = s; });
      component.onStatusClick('Active');
      expect(emitted).toBe('Active');
    });
  });

  describe('SVG arc (expiry fraction)', () => {
    it('returns 0 when active count is 0', async () => {
      await setup(makeSummary({ active: 0, expiringWithin30Days: 0 }));
      expect(component.expiryFraction()).toBe(0);
    });

    it('calculates correct fraction', async () => {
      await setup(makeSummary({ active: 100, expiringWithin30Days: 25 }));
      expect(component.expiryFraction()).toBe(0.25);
    });

    it('clamps fraction to 1 when expiringWithin30Days > active', async () => {
      await setup(makeSummary({ active: 10, expiringWithin30Days: 20 }));
      expect(component.expiryFraction()).toBe(1);
    });

    it('arcOffset decreases as fraction increases', async () => {
      await setup(makeSummary({ active: 100, expiringWithin30Days: 0 }));
      const fullOffset = component.arcOffset();

      storeSpy.summary.set(makeSummary({ active: 100, expiringWithin30Days: 50 }));
      fixture.detectChanges();
      const halfOffset = component.arcOffset();

      expect(halfOffset).toBeLessThan(fullOffset);
    });

    it('emits expiryClick on arc button click', async () => {
      await setup();
      let clicked = false;
      component.expiryClick.subscribe(() => { clicked = true; });
      component.onExpiryClick();
      expect(clicked).toBeTrue();
    });
  });

  describe('GWP by LOB bars', () => {
    it('returns empty array when gwpByLob is empty', async () => {
      await setup(makeSummary({ gwpByLob: {} }));
      expect(component.lobEntries().length).toBe(0);
    });

    it('sorts LOB entries by amount descending', async () => {
      await setup(makeSummary({ gwpByLob: { Marine: 100, Property: 500, Casualty: 300 } }));
      const entries = component.lobEntries();
      expect(entries[0].lob).toBe('Property');
      expect(entries[1].lob).toBe('Casualty');
      expect(entries[2].lob).toBe('Marine');
    });

    it('assigns widthPct=100 to the largest bar', async () => {
      await setup(makeSummary({ gwpByLob: { Property: 1000, Marine: 500 } }));
      const largest = component.lobEntries()[0];
      expect(largest.widthPct).toBe(100);
    });

    it('calculates proportional widthPct for smaller bars', async () => {
      await setup(makeSummary({ gwpByLob: { Property: 1000, Marine: 250 } }));
      const entries = component.lobEntries();
      expect(entries[1].widthPct).toBe(25);
    });

    it('updates reactively when summary signal changes', async () => {
      await setup(makeSummary({ gwpByLob: { Property: 1000 } }));
      expect(component.lobEntries().length).toBe(1);

      storeSpy.summary.set(makeSummary({ gwpByLob: { Property: 1000, Marine: 500, Casualty: 750 } }));
      fixture.detectChanges();
      expect(component.lobEntries().length).toBe(3);
    });
  });
});
