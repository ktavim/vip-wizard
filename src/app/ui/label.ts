import { Directive, ElementRef, inject } from '@angular/core';
import { cn } from '../lib/utils';

const BASE = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';

@Directive({
  selector: 'label[appLabel]',
})
export class LabelDirective {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    el.setAttribute('class', cn(BASE, el.getAttribute('class') ?? ''));
  }
}
