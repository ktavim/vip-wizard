import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { cn } from '../lib/utils';

export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0';

const VARIANTS: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
  outline: 'border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
};

const SIZES: Record<ButtonSize, string> = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 rounded-md px-3 text-xs',
  lg: 'h-10 rounded-md px-8',
  icon: 'h-9 w-9',
};

export function buttonVariants(variant: ButtonVariant = 'default', size: ButtonSize = 'default'): string {
  return cn(BASE, VARIANTS[variant], SIZES[size]);
}

@Directive({
  selector: 'button[appButton], a[appButton]',
})
export class ButtonDirective {
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('default');

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly authorClasses = this.el.nativeElement.getAttribute('class') ?? '';

  constructor() {
    effect(() => {
      this.el.nativeElement.setAttribute(
        'class',
        cn(buttonVariants(this.variant(), this.size()), this.authorClasses),
      );
    });
  }
}
