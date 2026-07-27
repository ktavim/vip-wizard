import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';
import { AuthMethodValue } from '../lib/models';
import { authColor } from '../lib/auth-colors';

@Component({
  selector: 'app-host-chip',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="chipClass()">
      <span [class]="hostClass()">{{ host() }}</span>
      <span [class]="badgeClass()">{{ colors().label }}</span>
      @if (removable()) {
        <button
          class="ml-0.5 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
          (click)="onRemoveClick($event)"
        >
          <lucide-angular [img]="X" class="w-3 h-3" />
        </button>
      }
    </div>
  `,
})
export class HostChip {
  readonly host = input.required<string>();
  readonly auth = input.required<AuthMethodValue>();
  readonly excluded = input(false);
  readonly removable = input(false);

  readonly remove = output<void>();

  protected readonly X = X;
  protected readonly colors = computed(() => authColor(this.auth()));

  protected chipClass = computed(() => {
    const base =
      'inline-flex items-center gap-2 px-2.5 py-1.5 rounded border transition-all cursor-grab active:cursor-grabbing bg-card/60 hover:bg-card';
    return this.excluded()
      ? `${base} opacity-40 border-border`
      : `${base} border-border hover:border-primary/30`;
  });

  protected hostClass = computed(() =>
    this.excluded()
      ? 'font-mono text-xs leading-none line-through text-muted-foreground'
      : 'font-mono text-xs leading-none text-foreground',
  );

  protected badgeClass = computed(() => {
    const c = this.colors();
    return `text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${c.bg} ${c.text} ${c.border}`;
  });

  protected onRemoveClick(event: Event): void {
    event.stopPropagation();
    this.remove.emit();
  }
}
