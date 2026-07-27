import { ChangeDetectionStrategy, Component, OnInit, computed, input, output, signal } from '@angular/core';
import { Vip, VipConfig } from '../lib/models';
import { authColor } from '../lib/auth-colors';
import { isValidIPv4 } from '../lib/validators';
import { ButtonDirective } from '../ui/button';
import { InputDirective } from '../ui/input';
import { LabelDirective } from '../ui/label';
import { SelectComponent, SelectOption } from '../ui/select';

const PROTOCOL_OPTIONS: SelectOption[] = [
  { value: 'HTTPS', label: 'HTTPS' },
  { value: 'HTTP', label: 'HTTP' },
  { value: 'TCP', label: 'TCP' },
];

@Component({
  selector: 'app-vip-config-section',
  imports: [InputDirective, LabelDirective, SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded border border-border bg-card overflow-hidden">
      <div class="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
        <span class="font-mono text-sm font-medium text-foreground">{{ vip().name }}</span>
        <span class="text-xs text-muted-foreground">
          {{ vip().hosts.length }} host{{ vip().hosts.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Host list -->
      <div class="px-4 py-2.5 border-b border-border bg-secondary/10">
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

      <!-- Config fields -->
      <div class="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="space-y-1.5">
          <label appLabel class="text-xs text-muted-foreground" [for]="fieldId('ip')">
            Virtual IP Address *
          </label>
          <input
            appInput
            [id]="fieldId('ip')"
            placeholder="10.0.1.100"
            [class]="ipInvalid() ? 'font-mono text-sm h-8 border-destructive focus:ring-destructive' : 'font-mono text-sm h-8'"
            [value]="config().ip"
            (input)="update('ip', $any($event.target).value)"
          />
          @if (ipInvalid()) {
            <p class="text-[11px] text-destructive">Invalid IPv4 format</p>
          }
        </div>

        <div class="space-y-1.5">
          <label appLabel class="text-xs text-muted-foreground" [for]="fieldId('port')">Port *</label>
          <input
            appInput
            [id]="fieldId('port')"
            type="number"
            placeholder="443"
            class="font-mono text-sm h-8"
            [value]="config().port"
            (input)="update('port', $any($event.target).value)"
          />
        </div>

        <div class="space-y-1.5">
          <label appLabel class="text-xs text-muted-foreground" [for]="fieldId('protocol')">
            Protocol *
          </label>
          <app-select
            [inputId]="fieldId('protocol')"
            [value]="config().protocol"
            (valueChange)="update('protocol', $event)"
            [options]="protocolOptions"
            triggerClass="h-8 text-sm"
          />
        </div>

        <div class="space-y-1.5">
          <label appLabel class="text-xs text-muted-foreground" [for]="fieldId('sslProfile')">
            SSL Profile
          </label>
          <input
            appInput
            [id]="fieldId('sslProfile')"
            placeholder="clientssl-secure"
            class="font-mono text-sm h-8"
            [value]="config().sslProfile"
            (input)="update('sslProfile', $any($event.target).value)"
          />
        </div>

        <div class="space-y-1.5">
          <label appLabel class="text-xs text-muted-foreground" [for]="fieldId('defaultPool')">
            Default Pool
          </label>
          <input
            appInput
            [id]="fieldId('defaultPool')"
            placeholder="pool_app_443"
            class="font-mono text-sm h-8"
            [value]="config().defaultPool"
            (input)="update('defaultPool', $any($event.target).value)"
          />
        </div>

        <div class="space-y-1.5">
          <label appLabel class="text-xs text-muted-foreground" [for]="fieldId('iRule')">
            iRule (optional)
          </label>
          <input
            appInput
            [id]="fieldId('iRule')"
            placeholder="irule_redirect"
            class="font-mono text-sm h-8"
            [value]="config().iRule"
            (input)="update('iRule', $any($event.target).value)"
          />
        </div>
      </div>
    </div>
  `,
})
export class VipConfigSection {
  readonly vip = input.required<Vip>();
  readonly config = input.required<VipConfig>();
  readonly configChange = output<VipConfig>();

  protected readonly protocolOptions = PROTOCOL_OPTIONS;
  protected readonly colorFor = authColor;

  protected readonly ipInvalid = computed(() => {
    const ip = this.config().ip;
    return !!ip && !isValidIPv4(ip);
  });

  /** Scoped to the VIP id so ids stay unique across the repeated config sections. */
  protected fieldId(field: keyof VipConfig): string {
    return `vip-${this.vip().id}-${field}`;
  }

  protected update(field: keyof VipConfig, value: string): void {
    this.configChange.emit({ ...this.config(), [field]: value });
  }
}

@Component({
  selector: 'app-step-configure-vips',
  imports: [ButtonDirective, VipConfigSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <div>
        <h2 class="text-lg font-semibold text-foreground">Configure VIP Details</h2>
        <p class="text-sm text-muted-foreground mt-0.5">
          Set F5 BIG-IP parameters for each virtual server.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4">
        @for (vip of vips(); track vip.id) {
          <app-vip-config-section
            [vip]="vip"
            [config]="configs()[vip.id]"
            (configChange)="updateConfig(vip.id, $event)"
          />
        }
      </div>

      <div class="flex items-center justify-between pt-4 border-t border-border">
        <button appButton variant="ghost" class="text-sm" (click)="back.emit(configs())">Back</button>
        <button
          appButton
          class="text-sm"
          [disabled]="!allValid()"
          (click)="next.emit(configs())"
        >
          Next: Review &amp; Deploy
        </button>
      </div>
    </div>
  `,
})
export class StepConfigureVIPs implements OnInit {
  readonly vips = input.required<Vip[]>();
  /** Previously-entered configs, keyed by VIP id, to restore on re-entry. */
  readonly initialConfigs = input<Record<string, VipConfig>>({});

  readonly next = output<Record<string, VipConfig>>();
  readonly back = output<Record<string, VipConfig>>();

  protected readonly configs = signal<Record<string, VipConfig>>({});

  protected readonly allValid = computed(() => {
    const configs = this.configs();
    return this.vips().every((v) => {
      const c = configs[v.id];
      return !!c && !!c.ip && isValidIPv4(c.ip) && !!c.port && !!c.protocol;
    });
  });

  ngOnInit(): void {
    // Reuse any saved config for a VIP that still exists; default the rest. VIPs removed on a
    // return trip to Step 2 simply drop out, and newly-added VIPs get fresh defaults.
    const saved = this.initialConfigs();
    const initial: Record<string, VipConfig> = {};
    for (const v of this.vips()) {
      initial[v.id] = saved[v.id]
        ? { ...saved[v.id] }
        : { ip: '', port: '443', protocol: 'HTTPS', sslProfile: '', defaultPool: '', iRule: '' };
    }
    this.configs.set(initial);
  }

  protected updateConfig(vipId: string, config: VipConfig): void {
    this.configs.update((prev) => ({ ...prev, [vipId]: config }));
  }
}
