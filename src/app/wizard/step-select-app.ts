import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AlertTriangle, ChevronRight, Loader2, LucideAngularModule, Server } from 'lucide-angular';
import { INVENTORY_API_BASE_URL } from '../lib/api/api-config';
import { AppSummaryDto } from '../lib/api/dto';
import { ApiError } from '../lib/api/http-api';
import { toAppSummaries } from '../lib/api/mappers';
import { AppSummary } from '../lib/models';
import { ButtonDirective } from '../ui/button';

@Component({
  selector: 'app-step-select-app',
  imports: [LucideAngularModule, ButtonDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-lg font-semibold text-foreground">Select Application</h2>
        <p class="text-sm text-muted-foreground mt-1">
          Choose the internal application to configure VIP routing for.
        </p>
      </div>

      @if (appsResource.isLoading()) {
        <div class="flex items-center gap-2.5 p-4 text-sm text-muted-foreground">
          <lucide-angular [img]="Loader2" class="w-4 h-4 animate-spin" />
          Loading applications…
        </div>
      } @else if (appsResource.error()) {
        <div
          class="flex items-start gap-2.5 p-3 rounded border border-destructive/30 bg-destructive/5"
        >
          <lucide-angular
            [img]="AlertTriangle"
            class="w-4 h-4 text-destructive flex-shrink-0 mt-0.5"
          />
          <div class="flex-1 space-y-2">
            <p class="text-sm text-destructive">Could not load applications.</p>
            <button appButton variant="outline" class="text-xs" (click)="appsResource.reload()">
              Retry
            </button>
          </div>
        </div>
      } @else {
        @if (loadError(); as err) {
          <div
            class="flex items-start gap-2.5 p-3 rounded border border-destructive/30 bg-destructive/5"
          >
            <lucide-angular
              [img]="AlertTriangle"
              class="w-4 h-4 text-destructive flex-shrink-0 mt-0.5"
            />
            <p class="text-sm text-destructive">{{ err.message }}</p>
          </div>
        }

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          @for (app of appsResource.value(); track app.id) {
            <button
              class="group flex items-center gap-4 p-4 rounded border border-border bg-card hover:border-primary/50 hover:bg-accent/50 transition-all text-left disabled:opacity-50 disabled:pointer-events-none"
              [disabled]="busy()"
              (click)="appSelected.emit(app.id)"
            >
              <div
                class="w-10 h-10 rounded bg-secondary flex items-center justify-center flex-shrink-0"
              >
                @if (loadingApp() === app.id) {
                  <lucide-angular [img]="Loader2" class="w-5 h-5 text-primary animate-spin" />
                } @else {
                  <lucide-angular
                    [img]="Server"
                    class="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors"
                  />
                }
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-mono text-sm font-medium text-foreground truncate">
                  {{ app.name }}
                </div>
                <div class="text-xs text-muted-foreground mt-0.5">
                  {{ app.serviceCount }} external
                  {{ app.serviceCount === 1 ? 'service' : 'services' }}
                </div>
              </div>
              <lucide-angular
                [img]="ChevronRight"
                class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0"
              />
            </button>
          } @empty {
            <p class="text-sm text-muted-foreground">No applications available.</p>
          }
        </div>
      }
    </div>
  `,
})
export class StepSelectApp {
  private readonly baseUrl = inject(INVENTORY_API_BASE_URL);

  /** Set by the Dashboard while it fetches that app's hosts. Null when idle. */
  readonly loadingApp = input<string | null>(null);
  /** Failure from the host fetch. Rendered here because this is where the retry lives. */
  readonly loadError = input<ApiError | null>(null);

  readonly appSelected = output<string>();

  protected readonly Server = Server;
  protected readonly ChevronRight = ChevronRight;
  protected readonly Loader2 = Loader2;
  protected readonly AlertTriangle = AlertTriangle;

  /**
   * `defaultValue` keeps `value()` typed as `AppSummary[]` rather than `AppSummary[] |
   * undefined`, so the template's `@for` needs no null handling.
   *
   * This component is destroyed and recreated by the Dashboard's `@switch` on every "Start
   * Over", so this refetches each time. Fine at this payload size; hoist to the Dashboard
   * if it ever isn't.
   */
  protected readonly appsResource = httpResource<AppSummary[]>(() => `${this.baseUrl}/apps/submitted`, {
    defaultValue: [],
    parse: (raw) => toAppSummaries(raw as AppSummaryDto[]),
  });

  /**
   * Disables every card while any app's hosts are loading. Beyond the obvious double-submit
   * guard, this removes the out-of-order-response race from rapid clicking without needing
   * a request-sequence token.
   */
  protected readonly busy = computed(() => this.loadingApp() !== null);
}
