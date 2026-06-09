/**
 * App (root component)
 *
 * What: Application shell — a Material toolbar with the product name and the
 * theme toggle, followed by the router outlet where lazy-loaded pages render.
 *
 * Why ChangeDetectionStrategy.OnPush: The shell has no mutable state of its own;
 * all dynamic content (theme icon) is owned by ThemePickerComponent.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ThemePickerComponent } from './shared/theme-picker/theme-picker.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, MatToolbarModule, ThemePickerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
