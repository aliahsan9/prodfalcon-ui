import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'prodfalcon-theme';
  readonly mode = signal<ThemeMode>(this.load());

  toggle(): void {
    const next = this.mode() === 'dark' ? 'light' : 'dark';
    this.apply(next);
  }

  apply(mode: ThemeMode): void {
    this.mode.set(mode);
    localStorage.setItem(this.storageKey, mode);
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(mode === 'dark' ? 'theme-dark' : 'theme-light');
  }

  init(): void {
    this.apply(this.mode());
  }

  private load(): ThemeMode {
    const stored = localStorage.getItem(this.storageKey) as ThemeMode | null;
    return stored ?? 'dark';
  }
}

