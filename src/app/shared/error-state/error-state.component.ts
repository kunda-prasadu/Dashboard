/**
 * ErrorStateComponent
 *
 * What: Shown when the store has a non-null error signal. Displays the error
 * message and a "Try again" button that emits a retry output event.
 *
 * Why store-agnostic:
 * The parent binds the message from the store and decides what retry means
 * (reload policies, re-fetch a specific resource). The component only renders
 * UI and emits events — it has no direct store dependency.
 *
 * Accessibility:
 * - role="alert" triggers an immediate announcement to screen readers on mount.
 * - The heading is an <h2> so it sits correctly below the page <h1>.
 */
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-error-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
})
export class ErrorStateComponent {
  readonly message = input<string>('An unexpected error occurred.');
  readonly retry = output<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
