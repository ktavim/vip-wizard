import { Directive, ElementRef, inject } from '@angular/core';
import { cn } from '../lib/utils';

const BASE =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

@Directive({
  selector: 'input[appInput]',
})
export class InputDirective {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    el.setAttribute('class', cn(BASE, el.getAttribute('class') ?? ''));
  }
}
