import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Check, LucideAngularModule } from 'lucide-angular';

interface StepMeta {
  num: number;
  label: string;
}

const STEPS: StepMeta[] = [
  { num: 1, label: 'Select App' },
  { num: 2, label: 'Assign Hosts' },
  { num: 3, label: 'Configure VIPs' },
  { num: 4, label: 'Review & Deploy' },
];

@Component({
  selector: 'app-wizard-progress',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-center gap-0 w-full max-w-2xl mx-auto">
      @for (step of steps; track step.num; let i = $index) {
        <div class="flex items-center flex-1 last:flex-none">
          <div class="flex flex-col items-center gap-1.5">
            <div [class]="circleClass(step.num)">
              @if (currentStep() > step.num) {
                <lucide-angular [img]="Check" class="w-4 h-4" />
              } @else {
                {{ step.num }}
              }
            </div>
            <span [class]="labelClass(step.num)">{{ step.label }}</span>
          </div>
          @if (i < steps.length - 1) {
            <div
              class="h-px flex-1 mx-3 mt-[-18px] transition-colors"
              [class.bg-primary]="currentStep() > step.num"
              [class.bg-border]="currentStep() <= step.num"
            ></div>
          }
        </div>
      }
    </div>
  `,
})
export class WizardProgress {
  readonly currentStep = input.required<number>();

  protected readonly steps = STEPS;
  protected readonly Check = Check;

  protected circleClass(num: number): string {
    const isActive = this.currentStep() === num;
    const isComplete = this.currentStep() > num;
    const base =
      'w-8 h-8 rounded flex items-center justify-center text-xs font-mono font-semibold transition-all';
    if (isComplete) return `${base} bg-primary text-primary-foreground`;
    if (isActive)
      return `${base} bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background`;
    return `${base} bg-secondary text-muted-foreground border border-border`;
  }

  protected labelClass(num: number): string {
    const base = 'text-[11px] font-medium whitespace-nowrap';
    if (this.currentStep() === num) return `${base} text-primary`;
    if (this.currentStep() > num) return `${base} text-foreground`;
    return `${base} text-muted-foreground`;
  }
}
