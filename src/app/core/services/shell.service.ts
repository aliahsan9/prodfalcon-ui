import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ShellService {
  readonly collapsed = signal(localStorage.getItem('pf-sidebar') === '1');

  toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
    localStorage.setItem('pf-sidebar', this.collapsed() ? '1' : '0');
  }
}
