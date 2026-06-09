/**
 * EmptyStateComponent
 *
 * What: Shown when a server-side filtered query returns zero results.
 * Displays a message and a "Clear filters" button that emits an output event.
 *
 * Why store-agnostic:
 * The component has no knowledge of PolicyStore or any specific filter model.
 * The parent decides what "clearing filters" means — it could navigate, reset a
 * form, or call any store action. This makes the component reusable across any
 * list view in the app.
 *
 * Accessibility:
 * - role="status" announces the empty state to screen readers when it appears.
 * - The heading is an <h2> (page <h1> is "Policy Portfolio") — correct hierarchy.
 */
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly message = input<string>('No policies match your filters.');
  readonly clearFilters = output<void>();

  onClear(): void {
    this.clearFilters.emit();
  }
}
