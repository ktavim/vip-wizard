import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { AlertTriangle, LucideAngularModule, Trash2 } from 'lucide-angular';
import { Host, Vip } from '../lib/models';
import { InputDirective } from '../ui/input';
import { HostChip } from './host-chip';

@Component({
  selector: 'app-vip-card',
  imports: [CdkDropList, CdkDrag, LucideAngularModule, InputDirective, HostChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded border border-border bg-card overflow-hidden">
      <div class="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-secondary/30">
        <input
          appInput
          class="h-7 text-xs font-mono bg-transparent border-transparent hover:border-input focus:border-primary px-1.5 flex-1"
          [value]="vip().name"
          (input)="rename.emit($any($event.target).value)"
        />
        <button
          class="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
          title="Delete VIP"
          (click)="delete.emit()"
        >
          <lucide-angular [img]="Trash2" class="w-3.5 h-3.5" />
        </button>
      </div>

      @if (hasMixedAuth()) {
        <div class="flex items-start gap-2 px-3 py-2 bg-amber-500/5 border-b border-amber-500/20">
          <lucide-angular [img]="AlertTriangle" class="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
          <span class="text-[11px] text-amber-500 leading-snug">
            VIP <span class="font-mono font-medium">{{ vip().name }}</span> mixes auth methods — verify
            F5 policy profiles are compatible.
          </span>
        </div>
      }

      <div
        [class]="dropZoneClass()"
        cdkDropList
        cdkDropListOrientation="mixed"
        [cdkDropListData]="vip().hosts"
        (cdkDropListDropped)="dropped.emit($event)"
        (cdkDropListEntered)="isOver.set(true)"
        (cdkDropListExited)="isOver.set(false)"
      >
        @if (vip().hosts.length === 0 && !isOver()) {
          <div
            class="w-full text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded"
          >
            Drop hosts here
          </div>
        }
        @for (host of vip().hosts; track host.host; let idx = $index) {
          <app-host-chip
            cdkDrag
            [cdkDragData]="host"
            [host]="host.host"
            [auth]="host.auth"
            [removable]="true"
            (remove)="removeHost.emit(idx)"
          />
        }
      </div>
    </div>
  `,
})
export class VipCard {
  readonly vip = input.required<Vip>();
  readonly index = input<number>(0);

  readonly rename = output<string>();
  readonly delete = output<void>();
  readonly removeHost = output<number>();
  readonly dropped = output<CdkDragDrop<Host[]>>();

  protected readonly isOver = signal(false);
  protected readonly Trash2 = Trash2;
  protected readonly AlertTriangle = AlertTriangle;

  protected readonly hasMixedAuth = computed(
    () => new Set(this.vip().hosts.map((h) => h.auth)).size > 1,
  );

  protected readonly dropZoneClass = computed(() => {
    const base = 'p-3 min-h-[60px] transition-colors flex flex-wrap gap-2 content-start';
    return this.isOver() ? `${base} bg-primary/5` : base;
  });
}
