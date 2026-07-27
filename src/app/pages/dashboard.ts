import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LucideAngularModule, Network, RotateCcw } from 'lucide-angular';
import { AppsApi } from '../lib/api/apps-api';
import { ApiError } from '../lib/api/http-api';
import { AssignState, Host, Vip, VipConfig } from '../lib/models';
import { ButtonDirective } from '../ui/button';
import { WizardProgress } from '../wizard/wizard-progress';
import { StepSelectApp } from '../wizard/step-select-app';
import { StepAssignHosts } from '../wizard/step-assign-hosts';
import { StepConfigureVIPs } from '../wizard/step-configure-vips';
import { StepReviewDeploy } from '../wizard/step-review-deploy';

@Component({
  selector: 'app-dashboard',
  imports: [
    LucideAngularModule,
    ButtonDirective,
    WizardProgress,
    StepSelectApp,
    StepAssignHosts,
    StepConfigureVIPs,
    StepReviewDeploy,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-background">
      <!-- Header -->
      <header class="border-b border-border bg-card">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <lucide-angular [img]="Network" class="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 class="text-sm font-semibold text-foreground leading-none">Fast &amp; Furious</h1>
              <span class="text-[11px] text-muted-foreground">F5 BIG-IP VIP Configurator</span>
            </div>
          </div>
          @if (step() > 1) {
            <button
              appButton
              variant="ghost"
              size="sm"
              class="text-xs gap-1.5 text-muted-foreground"
              (click)="resetWizard()"
            >
              <lucide-angular [img]="RotateCcw" class="w-3 h-3" />
              Start Over
            </button>
          }
        </div>
      </header>

      <!-- Wizard Progress -->
      <div class="border-b border-border bg-card/50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <app-wizard-progress [currentStep]="step()" />
        </div>
      </div>

      <!-- Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        @switch (step()) {
          @case (1) {
            <app-step-select-app
              [loadingApp]="loadingApp()"
              [loadError]="loadError()"
              (appSelected)="selectApp($event)"
            />
          }
          @case (2) {
            <app-step-assign-hosts
              [appName]="selectedApp() ?? ''"
              [hosts]="appHosts()"
              [initial]="assignState()"
              (next)="handleVipAssignment($event)"
              (back)="step.set(1)"
            />
          }
          @case (3) {
            <app-step-configure-vips
              [vips]="vips()"
              [initialConfigs]="configs()"
              (next)="handleVipConfig($event)"
              (back)="handleConfigBack($event)"
            />
          }
          @case (4) {
            <app-step-review-deploy
              [appId]="selectedApp() ?? ''"
              [vips]="vips()"
              [configs]="configs()"
              (back)="step.set(3)"
            />
          }
        }
      </main>
    </div>
  `,
})
export class Dashboard {
  private readonly appsApi = inject(AppsApi);

  protected readonly step = signal(1);
  protected readonly selectedApp = signal<string | null>(null);
  protected readonly appHosts = signal<Host[]>([]);
  protected readonly assignState = signal<AssignState | null>(null);
  protected readonly vips = signal<Vip[]>([]);
  protected readonly configs = signal<Record<string, VipConfig>>({});

  /** Id of the app whose hosts are being fetched, or null when idle. */
  protected readonly loadingApp = signal<string | null>(null);
  protected readonly loadError = signal<ApiError | null>(null);

  protected readonly Network = Network;
  protected readonly RotateCcw = RotateCcw;

  /**
   * Fetches the app's hosts and advances only on success.
   *
   * **The wizard must not advance before hosts arrive.** `StepAssignHosts.ngOnInit`
   * snapshots its `hosts` input exactly once to seed the VIP list — no effect watches it —
   * so mounting step 2 with an empty array produces a permanently empty step that never
   * recovers when the data lands. Gating navigation here is what keeps async concerns out
   * of that component entirely.
   */
  protected async selectApp(appId: string): Promise<void> {
    if (this.loadingApp() !== null) {
      return;
    }

    this.loadingApp.set(appId);
    this.loadError.set(null);

    const result = await this.appsApi.getHosts(appId);
    this.loadingApp.set(null);

    if (!result.ok) {
      // Stay on step 1. Retry needs no dedicated affordance — the user is already on the
      // screen where retrying means clicking the app again.
      this.loadError.set(result.error);
      return;
    }

    // Selecting an app is a deliberate fresh start — clear any prior wizard state.
    this.selectedApp.set(appId);
    this.appHosts.set(result.data);
    this.assignState.set(null);
    this.vips.set([]);
    this.configs.set({});
    this.step.set(2);
  }

  protected handleVipAssignment(state: AssignState): void {
    this.assignState.set(state);
    this.vips.set(state.vips.filter((v) => v.hosts.length > 0));
    this.step.set(3);
  }

  protected handleConfigBack(vipConfigs: Record<string, VipConfig>): void {
    this.configs.set(vipConfigs);
    this.step.set(2);
  }

  protected handleVipConfig(vipConfigs: Record<string, VipConfig>): void {
    this.configs.set(vipConfigs);
    this.step.set(4);
  }

  protected resetWizard(): void {
    this.step.set(1);
    this.selectedApp.set(null);
    this.appHosts.set([]);
    this.assignState.set(null);
    this.vips.set([]);
    this.configs.set({});
    this.loadingApp.set(null);
    this.loadError.set(null);
  }
}
