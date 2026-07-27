import { ChangeDetectionStrategy, Component, OnInit, computed, input, output, signal } from '@angular/core';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { ChevronDown, ChevronRight, LucideAngularModule, Plus, RotateCcw } from 'lucide-angular';
import { AssignState, Host, Vip } from '../lib/models';
import { ButtonDirective } from '../ui/button';
import { HostChip } from './host-chip';
import { VipCard } from './vip-card';

@Component({
  selector: 'app-step-assign-hosts',
  imports: [
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    LucideAngularModule,
    ButtonDirective,
    HostChip,
    VipCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-foreground">Assign Hosts to VIPs</h2>
          <p class="text-sm text-muted-foreground mt-0.5">
            Application: <span class="font-mono text-foreground">{{ appName() }}</span> — drag hosts
            between VIPs to consolidate or separate.
          </p>
        </div>
      </div>

      <div cdkDropListGroup>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
          <!-- VIP Column -->
          <div class="md:col-span-3 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                VIP Assignments
              </h3>
              <button appButton variant="outline" size="sm" class="h-7 text-xs gap-1.5" (click)="addVip()">
                <lucide-angular [img]="Plus" class="w-3 h-3" />
                New VIP
              </button>
            </div>

            @if (vips().length === 0) {
              <div class="border border-dashed border-border rounded p-8 text-center text-sm text-muted-foreground">
                No VIPs defined. Create one to start assigning hosts.
              </div>
            }

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              @for (vip of vips(); track vip.id; let i = $index) {
                <app-vip-card
                  [vip]="vip"
                  [index]="i"
                  (rename)="renameVip(vip.id, $event)"
                  (delete)="deleteVip(vip.id)"
                  (removeHost)="removeHostFromVip(vip.id, $event)"
                  (dropped)="onDrop($event)"
                />
              }
            </div>
          </div>

          <!-- Right Column: Unassigned + Excluded -->
          <div class="space-y-4">
            <!-- Unassigned Pool -->
            <div class="rounded border border-border bg-card overflow-hidden">
              <div class="px-3 py-2.5 border-b border-border bg-secondary/30">
                <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Unassigned Hosts
                  @if (unassigned().length > 0) {
                    <span class="ml-2 text-amber-500 font-mono">({{ unassigned().length }})</span>
                  }
                </h3>
              </div>
              <div
                [class]="unassignedZoneClass()"
                cdkDropList
                cdkDropListOrientation="mixed"
                [cdkDropListData]="unassigned()"
                (cdkDropListDropped)="onDrop($event)"
                (cdkDropListEntered)="unassignedOver.set(true)"
                (cdkDropListExited)="unassignedOver.set(false)"
              >
                @if (unassigned().length === 0 && !unassignedOver()) {
                  <div class="w-full text-xs text-muted-foreground text-center py-4">
                    {{ excluded().length > 0 ? 'All hosts assigned or excluded' : 'All hosts assigned' }}
                  </div>
                }
                @for (h of unassigned(); track h.host; let idx = $index) {
                  <app-host-chip
                    cdkDrag
                    [cdkDragData]="h"
                    [host]="h.host"
                    [auth]="h.auth"
                    [removable]="true"
                    (remove)="excludeHostFromUnassigned(idx)"
                  />
                }
              </div>
            </div>

            <!-- Excluded Section -->
            <div class="rounded border border-border bg-card overflow-hidden">
              <button
                class="w-full flex items-center gap-2 px-3 py-2.5 border-b border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                (click)="excludedOpen.set(!excludedOpen())"
              >
                <lucide-angular
                  [img]="excludedOpen() ? ChevronDown : ChevronRight"
                  class="w-3.5 h-3.5 text-muted-foreground"
                />
                <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Excluded from VIPs
                  @if (excluded().length > 0) {
                    <span class="ml-2 font-mono">({{ excluded().length }})</span>
                  }
                </h3>
              </button>
              @if (excludedOpen()) {
                <div
                  [class]="excludedZoneClass()"
                  cdkDropList
                  cdkDropListOrientation="mixed"
                  [cdkDropListData]="excluded()"
                  (cdkDropListDropped)="onDrop($event)"
                  (cdkDropListEntered)="excludedOver.set(true)"
                  (cdkDropListExited)="excludedOver.set(false)"
                >
                  @if (excluded().length === 0 && !excludedOver()) {
                    <div class="w-full text-xs text-muted-foreground text-center py-3">
                      Drag hosts here to exclude them
                    </div>
                  }
                  @for (h of excluded(); track h.host; let idx = $index) {
                    <div cdkDrag [cdkDragData]="h" class="flex items-center gap-1">
                      <app-host-chip [host]="h.host" [auth]="h.auth" [excluded]="true" />
                      <button
                        class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Restore"
                        (click)="restoreHost(idx)"
                      >
                        <lucide-angular [img]="RotateCcw" class="w-3 h-3" />
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between pt-4 border-t border-border">
        <button appButton variant="ghost" class="text-sm" (click)="back.emit()">Back</button>
        <div class="flex items-center gap-3">
          @if (!allAssigned()) {
            <span class="text-xs text-amber-500">
              {{ unassigned().length }} host{{ unassigned().length !== 1 ? 's' : '' }} unassigned
            </span>
          }
          <button
            appButton
            class="text-sm"
            [disabled]="!allAssigned() || vipsWithHosts().length === 0"
            (click)="proceed()"
          >
            Next: Configure VIPs
          </button>
        </div>
      </div>
    </div>
  `,
})
export class StepAssignHosts implements OnInit {
  readonly appName = input.required<string>();
  readonly hosts = input.required<Host[]>();
  /** Previously-saved state to restore on re-entry; null on the first visit. */
  readonly initial = input<AssignState | null>(null);

  readonly next = output<AssignState>();
  readonly back = output<void>();

  protected readonly vips = signal<Vip[]>([]);
  protected readonly unassigned = signal<Host[]>([]);
  protected readonly excluded = signal<Host[]>([]);
  protected readonly excludedOpen = signal(false);
  protected readonly unassignedOver = signal(false);
  protected readonly excludedOver = signal(false);

  private nextVipId = 0;

  protected readonly Plus = Plus;
  protected readonly RotateCcw = RotateCcw;
  protected readonly ChevronDown = ChevronDown;
  protected readonly ChevronRight = ChevronRight;

  protected readonly allAssigned = computed(() => this.unassigned().length === 0);
  protected readonly vipsWithHosts = computed(() => this.vips().filter((v) => v.hosts.length > 0));

  protected readonly unassignedZoneClass = computed(() => {
    const base = 'p-3 min-h-[80px] transition-colors flex flex-wrap gap-2 content-start';
    return this.unassignedOver() ? `${base} bg-primary/5` : base;
  });

  protected readonly excludedZoneClass = computed(() => {
    const base = 'p-3 min-h-[60px] transition-colors flex flex-wrap gap-2 content-start';
    return this.excludedOver() ? `${base} bg-destructive/5` : base;
  });

  ngOnInit(): void {
    const saved = this.initial();
    if (saved) {
      // Restore from the Dashboard's persisted state. Clone so the live working arrays (which
      // CDK mutates in place) stay decoupled from the stored copy.
      this.vips.set(saved.vips.map((v) => ({ ...v, hosts: v.hosts.map((h) => ({ ...h })) })));
      this.unassigned.set(saved.unassigned.map((h) => ({ ...h })));
      this.excluded.set(saved.excluded.map((h) => ({ ...h })));
      this.nextVipId = saved.nextVipId;
      return;
    }
    const app = this.appName();
    const hosts = this.hosts();
    this.vips.set(
      hosts.map((h, i) => ({ id: `vip-${i}`, name: `${app}-vip-${i + 1}`, hosts: [{ ...h }] })),
    );
    this.nextVipId = hosts.length;
  }

  /** Emit a decoupled snapshot of the full state so the Dashboard can persist and later restore it. */
  protected proceed(): void {
    this.next.emit({
      vips: this.vips().map((v) => ({ ...v, hosts: v.hosts.map((h) => ({ ...h })) })),
      unassigned: this.unassigned().map((h) => ({ ...h })),
      excluded: this.excluded().map((h) => ({ ...h })),
      nextVipId: this.nextVipId,
    });
  }

  protected onDrop(event: CdkDragDrop<Host[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
    this.refresh();
  }

  protected addVip(): void {
    const id = this.nextVipId;
    this.vips.update((vs) => [
      ...vs,
      { id: `vip-${id}`, name: `${this.appName()}-vip-${id + 1}`, hosts: [] },
    ]);
    this.nextVipId += 1;
  }

  protected deleteVip(vipId: string): void {
    const vip = this.vips().find((v) => v.id === vipId);
    if (vip && vip.hosts.length > 0) {
      this.unassigned.update((u) => [...u, ...vip.hosts]);
    }
    this.vips.update((vs) => vs.filter((v) => v.id !== vipId));
  }

  protected renameVip(vipId: string, name: string): void {
    this.vips.update((vs) => vs.map((v) => (v.id === vipId ? { ...v, name } : v)));
  }

  protected removeHostFromVip(vipId: string, hostIndex: number): void {
    const vip = this.vips().find((v) => v.id === vipId);
    if (!vip) return;
    const removed = vip.hosts[hostIndex];
    this.vips.update((vs) =>
      vs.map((v) =>
        v.id === vipId ? { ...v, hosts: v.hosts.filter((_, i) => i !== hostIndex) } : v,
      ),
    );
    this.unassigned.update((u) => [...u, removed]);
  }

  protected excludeHostFromUnassigned(index: number): void {
    const host = this.unassigned()[index];
    this.unassigned.update((u) => u.filter((_, i) => i !== index));
    this.excluded.update((e) => [...e, host]);
  }

  protected restoreHost(index: number): void {
    const host = this.excluded()[index];
    this.excluded.update((e) => e.filter((_, i) => i !== index));
    this.unassigned.update((u) => [...u, host]);
  }

  /**
   * CDK's array helpers mutate the drop-list arrays in place. Re-set every signal to a fresh
   * reference (with fresh VIP host arrays) so zoneless/OnPush change detection re-renders.
   */
  private refresh(): void {
    this.vips.set(this.vips().map((v) => ({ ...v, hosts: [...v.hosts] })));
    this.unassigned.set([...this.unassigned()]);
    this.excluded.set([...this.excluded()]);
  }
}
