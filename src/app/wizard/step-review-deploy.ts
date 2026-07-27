import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  LucideAngularModule,
  Play,
  Rocket,
} from 'lucide-angular';
import { DeploymentsApi } from '../lib/api/deployments-api';
import { ApiError } from '../lib/api/http-api';
import { DeployResult, DryRunResult, Vip, VipConfig } from '../lib/models';
import { authColor } from '../lib/auth-colors';
import { ButtonDirective } from '../ui/button';
import { FindingsPanel } from './findings-panel';

/**
 * Status is kept separate from payload rather than crammed into one union: the server's
 * verdict (`pass`/`warn`/`fail`) is orthogonal to whether the request completed, and the
 * flat union had nowhere to put `findings`.
 */
type RequestStatus = 'idle' | 'loading' | 'done' | 'error';

@Component({
  selector: 'app-vip-summary',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded border border-border bg-card overflow-hidden">
      <div class="px-4 py-3 border-b border-border bg-secondary/30">
        <span class="font-mono text-sm font-medium text-foreground">{{ vip().name }}</span>
      </div>
      <div class="p-4 space-y-3">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span class="text-muted-foreground block">Virtual IP</span>
            <span class="font-mono text-foreground">{{ config().ip }}</span>
          </div>
          <div>
            <span class="text-muted-foreground block">Port</span>
            <span class="font-mono text-foreground">{{ config().port }}</span>
          </div>
          <div>
            <span class="text-muted-foreground block">Protocol</span>
            <span class="font-mono text-foreground">{{ config().protocol }}</span>
          </div>
          @if (config().sslProfile) {
            <div>
              <span class="text-muted-foreground block">SSL Profile</span>
              <span class="font-mono text-foreground">{{ config().sslProfile }}</span>
            </div>
          }
          @if (config().defaultPool) {
            <div>
              <span class="text-muted-foreground block">Default Pool</span>
              <span class="font-mono text-foreground">{{ config().defaultPool }}</span>
            </div>
          }
          @if (config().iRule) {
            <div>
              <span class="text-muted-foreground block">iRule</span>
              <span class="font-mono text-foreground">{{ config().iRule }}</span>
            </div>
          }
        </div>

        <div>
          <span class="text-xs text-muted-foreground block mb-1.5">Assigned Hosts</span>
          <div class="flex flex-wrap gap-1.5">
            @for (h of vip().hosts; track h.host) {
              <span
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border"
                [class]="colorFor(h.auth).bg + ' ' + colorFor(h.auth).border"
              >
                <span class="font-mono text-foreground">{{ h.host }}</span>
                <span class="text-[10px] font-semibold uppercase" [class]="colorFor(h.auth).text">
                  {{ colorFor(h.auth).label }}
                </span>
              </span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class VipSummary {
  readonly vip = input.required<Vip>();
  readonly config = input.required<VipConfig>();
  protected readonly colorFor = authColor;
}

@Component({
  selector: 'app-step-review-deploy',
  imports: [LucideAngularModule, ButtonDirective, VipSummary, FindingsPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <div>
        <h2 class="text-lg font-semibold text-foreground">Review &amp; Deploy</h2>
        <p class="text-sm text-muted-foreground mt-0.5">
          Verify configuration before pushing to F5 BIG-IP.
        </p>
      </div>

      <div class="space-y-3">
        @for (vip of vips(); track vip.id) {
          <app-vip-summary [vip]="vip" [config]="configs()[vip.id]" />
        }
      </div>

      @if (dryRunResult(); as result) {
        <app-findings-panel [outcome]="result.outcome" [findings]="result.findings" />
      }
      @if (dryRunError(); as err) {
        <div
          class="flex items-center gap-2.5 p-3 rounded border border-destructive/30 bg-destructive/5"
        >
          <lucide-angular [img]="AlertTriangle" class="w-4 h-4 text-destructive flex-shrink-0" />
          <span class="text-sm text-destructive">Dry run could not run. {{ err.message }}</span>
        </div>
      }

      @if (deployResult(); as result) {
        <div class="flex items-center gap-2.5 p-3 rounded border border-primary/30 bg-primary/5">
          <lucide-angular [img]="CheckCircle" class="w-4 h-4 text-primary flex-shrink-0" />
          <span class="text-sm text-primary">
            Deployment successful — {{ result.vipResults.length }} VIP{{
              result.vipResults.length !== 1 ? 's' : ''
            }}
            pushed to F5 BIG-IP.
          </span>
        </div>
      }
      @if (deployError(); as err) {
        <div
          class="flex items-center gap-2.5 p-3 rounded border border-destructive/30 bg-destructive/5"
        >
          <lucide-angular [img]="AlertTriangle" class="w-4 h-4 text-destructive flex-shrink-0" />
          <span class="text-sm text-destructive">Deployment failed. {{ err.message }}</span>
        </div>
      }

      <div class="flex items-center justify-between pt-4 border-t border-border">
        <button
          appButton
          variant="ghost"
          class="text-sm"
          [disabled]="deployStatus() === 'loading'"
          (click)="back.emit()"
        >
          Back
        </button>
        <div class="flex items-center gap-3">
          <button
            appButton
            variant="outline"
            class="text-sm gap-2"
            [disabled]="dryRunDisabled()"
            (click)="runDryRun()"
          >
            @if (dryRunStatus() === 'loading') {
              <lucide-angular [img]="Loader2" class="w-3.5 h-3.5 animate-spin" />
            } @else {
              <lucide-angular [img]="Play" class="w-3.5 h-3.5" />
            }
            Dry Run
          </button>
          <button appButton class="text-sm gap-2" [disabled]="deployDisabled()" (click)="deploy()">
            @if (deployStatus() === 'loading') {
              <lucide-angular [img]="Loader2" class="w-3.5 h-3.5 animate-spin" />
            } @else {
              <lucide-angular [img]="Rocket" class="w-3.5 h-3.5" />
            }
            {{ deployButtonLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class StepReviewDeploy {
  private readonly deploymentsApi = inject(DeploymentsApi);

  readonly appId = input.required<string>();
  readonly vips = input.required<Vip[]>();
  readonly configs = input.required<Record<string, VipConfig>>();
  readonly back = output<void>();

  protected readonly dryRunStatus = signal<RequestStatus>('idle');
  protected readonly dryRunResult = signal<DryRunResult | null>(null);
  protected readonly dryRunError = signal<ApiError | null>(null);

  protected readonly deployStatus = signal<RequestStatus>('idle');
  protected readonly deployResult = signal<DeployResult | null>(null);
  protected readonly deployError = signal<ApiError | null>(null);

  /**
   * One key per configuration, reused across retries — so a retry after a network timeout,
   * where the first request may well have succeeded server-side, cannot double-create VIPs
   * on the F5.
   *
   * A per-instance field is sufficient precisely because the Dashboard's `@switch` destroys
   * and recreates this component whenever the user navigates back to edit. Editing the
   * configuration therefore yields a genuinely new deployment with a new key, while every
   * retry within one visit reuses the same one. If step 4 ever stops being destroyed on
   * back-navigation, this needs to become an explicit reset instead.
   */
  private readonly idempotencyKey = crypto.randomUUID();

  protected readonly CheckCircle = CheckCircle;
  protected readonly AlertTriangle = AlertTriangle;
  protected readonly Loader2 = Loader2;
  protected readonly Play = Play;
  protected readonly Rocket = Rocket;

  /**
   * Note this does NOT lock out on a failed deploy. The previous expression
   * (`deployState() !== 'idle'`) meant that once deploy could fail, the user could never
   * re-run a dry run to diagnose it.
   */
  protected readonly dryRunDisabled = computed(
    () =>
      this.dryRunStatus() === 'loading' ||
      this.deployStatus() === 'loading' ||
      this.deployResult() !== null,
  );

  /** Deploy is gated on the server's verdict — warnings pass, a hard `fail` does not. */
  protected readonly deployDisabled = computed(
    () =>
      this.deployStatus() === 'loading' ||
      this.deployResult() !== null ||
      this.dryRunResult()?.outcome === 'fail',
  );

  protected readonly deployButtonLabel = computed(() => {
    if (this.deployResult() !== null) return 'Deployed';
    if (this.deployStatus() === 'error') return 'Retry Deploy';
    return 'Deploy to F5';
  });

  protected async runDryRun(): Promise<void> {
    this.dryRunStatus.set('loading');
    this.dryRunError.set(null);

    const result = await this.deploymentsApi.dryRun(this.appId(), this.vips(), this.configs());

    if (!result.ok) {
      this.dryRunStatus.set('error');
      this.dryRunError.set(result.error);
      return;
    }

    this.dryRunStatus.set('done');
    this.dryRunResult.set(result.data);
  }

  protected async deploy(): Promise<void> {
    this.deployStatus.set('loading');
    this.deployError.set(null);

    const result = await this.deploymentsApi.deploy(
      this.appId(),
      this.vips(),
      this.configs(),
      this.idempotencyKey,
    );

    if (!result.ok) {
      this.deployStatus.set('error');
      this.deployError.set(result.error);
      return;
    }

    this.deployStatus.set('done');
    this.deployResult.set(result.data);
  }
}
