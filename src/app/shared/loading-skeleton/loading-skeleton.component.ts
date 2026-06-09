/**
 * LoadingSkeletonComponent
 *
 * What: Animated placeholder that mimics the policy-dashboard layout (filter bar,
 * 4 status cards, table rows) while HTTP data is in flight.
 *
 * Why skeleton screens instead of a spinner:
 * Skeleton screens reduce perceived load time by filling space with recognisable
 * structural shapes — the user's eye immediately understands "data is coming here"
 * rather than staring at a centred spinner with no spatial context. Research by
 * Luke Wroblewski and Facebook A/B tests show skeletons test faster subjectively.
 *
 * Why store-agnostic (no store injection):
 * The skeleton is a dumb presentational component. Visibility is controlled by the
 * parent page via @if. Stateless design means it can be placed in any loading context
 * without coupling to a specific store.
 *
 * Accessibility:
 * - role="status" + aria-live="polite" announce loading to screen readers.
 * - aria-busy="true" on the container signals content is not yet ready.
 * - prefers-reduced-motion: animation disabled via CSS; shapes remain visible.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loading-skeleton.component.html',
  styleUrl: './loading-skeleton.component.scss',
})
export class LoadingSkeletonComponent {
  protected readonly statusCards = Array.from({ length: 4 });
  protected readonly tableRows   = Array.from({ length: 8 });
  protected readonly tableCols   = ['3%', '12%', '22%', '10%', '10%', '10%', '10%', '8%'];
}
