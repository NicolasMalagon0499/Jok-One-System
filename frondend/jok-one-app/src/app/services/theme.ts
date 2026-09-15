import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'jokone-theme';
export type ThemeMode = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>('dark');

  // La app nació 100% oscura; si el usuario nunca eligió nada, se mantiene
  // ese comportamiento por defecto en vez de adivinar según el sistema.
  init() {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    this.apply(saved === 'light' ? 'light' : 'dark');
  }

  toggle() {
    this.apply(this.mode() === 'dark' ? 'light' : 'dark');
  }

  private apply(mode: ThemeMode) {
    this.mode.set(mode);
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem(STORAGE_KEY, mode);

    // Para que los controles nativos del navegador (scrollbars, inputs)
    // también sigan el tema en vez de quedarse forzados en oscuro.
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', mode);
  }
}
