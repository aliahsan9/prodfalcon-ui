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

  setMode(mode: ThemeMode): void {
    this.apply(mode);
  }

  apply(mode: ThemeMode): void {
    this.mode.set(mode);
    localStorage.setItem(this.storageKey, mode);
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(mode === 'dark' ? 'theme-dark' : 'theme-light');
    document.documentElement.setAttribute('data-bs-theme', mode);
    document.documentElement.style.colorScheme = mode;
  }

  init(): void {
    const preferred = this.load();
    this.apply(preferred);
  }

  private load(): ThemeMode {
    const stored = localStorage.getItem(this.storageKey) as ThemeMode | null;
    if (stored === 'dark' || stored === 'light') return stored;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }
}
