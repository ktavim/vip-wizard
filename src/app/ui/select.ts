import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { Check, ChevronDown, LucideAngularModule } from 'lucide-angular';
import { cn } from '../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

const TRIGGER_BASE =
  'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1';

@Component({
  selector: 'app-select',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <button
        type="button"
        [id]="inputId() || null"
        [class]="triggerClasses()"
        [attr.aria-expanded]="open()"
        (click)="toggle($event)"
      >
        <span>{{ selectedLabel() }}</span>
        <lucide-angular [img]="ChevronDown" class="h-4 w-4 opacity-50" />
      </button>

      @if (open()) {
        <div
          class="absolute left-0 top-full z-50 mt-1 max-h-96 min-w-[8rem] w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <div class="p-1">
            @for (opt of options(); track opt.value) {
              <button
                type="button"
                class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                (click)="select(opt.value)"
              >
                <span class="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                  @if (opt.value === value()) {
                    <lucide-angular [img]="Check" class="h-4 w-4" />
                  }
                </span>
                {{ opt.label }}
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class SelectComponent {
  readonly value = model<string>('');
  readonly options = input<SelectOption[]>([]);
  readonly triggerClass = input<string>('');
  /** Applied to the trigger button so an external <label for> can associate with it. */
  readonly inputId = input<string>('');

  protected readonly open = signal(false);
  protected readonly ChevronDown = ChevronDown;
  protected readonly Check = Check;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly triggerClasses = computed(() => cn(TRIGGER_BASE, this.triggerClass()));

  protected readonly selectedLabel = computed(() => {
    const current = this.value();
    return this.options().find((o) => o.value === current)?.label ?? current;
  });

  protected toggle(event: Event): void {
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  protected select(value: string): void {
    this.value.set(value);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
