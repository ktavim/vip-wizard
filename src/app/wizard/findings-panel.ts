import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AlertTriangle, CheckCircle, Info, LucideAngularModule, XCircle } from 'lucide-angular';
import { DryRunOutcome, Finding, FindingSeverityValue } from '../lib/models';

interface SeverityStyle {
  border: string;
  bg: string;
  text: string;
}

/**
 * Severity → Tailwind, following the same shape as `AUTH_COLORS` including the fallback,
 * so a severity introduced by a newer server renders neutrally instead of unstyled.
 */
const SEVERITY_STYLES: Record<string, SeverityStyle> = {
  error: {
    border: 'border-destructive/30',
    bg: 'bg-destructive/5',
    text: 'text-destructive',
  },
  warning: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    text: 'text-amber-500',
  },
  info: {
    border: 'border-border',
    bg: 'bg-secondary/30',
    text: 'text-muted-foreground',
  },
};

const OUTCOME_STYLES: Record<DryRunOutcome, SeverityStyle & { label: string }> = {
  pass: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-500',
    label: 'Dry run passed — all VIP configurations validated successfully.',
  },
  warn: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    text: 'text-amber-500',
    label: 'Dry run completed with warnings.',
  },
  fail: {
    border: 'border-destructive/30',
    bg: 'bg-destructive/5',
    text: 'text-destructive',
    label: 'Dry run failed — resolve the errors below before deploying.',
  },
};

/**
 * Renders server-authored validation findings.
 *
 * Deliberately dumb: it holds no knowledge of what any particular finding means. All
 * user-facing text comes from the server's `message`, which is why adding a new validation
 * rule on the backend needs no frontend change.
 */
@Component({
  selector: 'app-findings-panel',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2">
      <div
        class="flex items-center gap-2.5 p-3 rounded border {{ outcomeStyle().border }} {{
          outcomeStyle().bg
        }}"
      >
        <lucide-angular
          [img]="outcomeIcon()"
          class="w-4 h-4 flex-shrink-0 {{ outcomeStyle().text }}"
        />
        <span class="text-sm {{ outcomeStyle().text }}">{{ outcomeStyle().label }}</span>
      </div>

      @for (finding of findings(); track finding.code + '|' + finding.vipId) {
        <div
          class="flex items-start gap-2.5 p-3 rounded border {{
            styleFor(finding.severity).border
          }} {{ styleFor(finding.severity).bg }}"
        >
          <lucide-angular
            [img]="iconFor(finding.severity)"
            class="w-4 h-4 flex-shrink-0 mt-0.5 {{ styleFor(finding.severity).text }}"
          />
          <div class="flex-1 min-w-0 space-y-0.5">
            <p class="text-sm {{ styleFor(finding.severity).text }}">
              {{ finding.message }}
            </p>
            @if (finding.vipId || finding.field) {
              <p class="text-xs text-muted-foreground font-mono">
                {{ finding.vipId }}{{ finding.vipId && finding.field ? ' · ' : ''
                }}{{ finding.field }}
              </p>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class FindingsPanel {
  readonly outcome = input.required<DryRunOutcome>();
  readonly findings = input.required<Finding[]>();

  protected readonly outcomeStyle = computed(() => OUTCOME_STYLES[this.outcome()]);

  protected readonly outcomeIcon = computed(() => {
    switch (this.outcome()) {
      case 'pass':
        return CheckCircle;
      case 'warn':
        return AlertTriangle;
      default:
        return XCircle;
    }
  });

  protected styleFor(severity: FindingSeverityValue): SeverityStyle {
    return SEVERITY_STYLES[severity] ?? SEVERITY_STYLES['info'];
  }

  protected iconFor(severity: FindingSeverityValue): typeof Info {
    if (severity === 'error') return XCircle;
    if (severity === 'warning') return AlertTriangle;
    return Info;
  }
}
