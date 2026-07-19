import type { ThemePref } from '../data/types';
export type Scheme = 'light' | 'dark';

// Shared reactive system scheme (from Telegram / OS). Updated on theme changes
// so logos and theme-aware UI re-render live, not just on manual toggle.
export const sys = $state<{ scheme: Scheme }>({ scheme: 'light' });

// Решение Дмитрия (2026-07-19): «Авто» убрано — светлая по умолчанию, тёмная по явному выбору.
// Второй аргумент сохранён, чтобы не трогать все места вызова; легаси-'auto' в данных = светлая.
export function resolveTheme(pref: ThemePref, _system?: Scheme): Scheme {
  return pref === 'dark' ? 'dark' : 'light';
}
export function applyTheme(scheme: Scheme) {
  document.documentElement.setAttribute('data-theme', scheme);
}
// In a plain browser «Авто» must follow the OS, not default to light.
// Returns an unsubscribe function; no-op inside Telegram (its colorScheme rules there).
export function watchSystemScheme(inTelegram: boolean, onChange: (s: Scheme) => void): () => void {
  if (inTelegram || typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  onChange(mq.matches ? 'dark' : 'light');
  const h = (e: MediaQueryListEvent) => onChange(e.matches ? 'dark' : 'light');
  mq.addEventListener?.('change', h);
  return () => mq.removeEventListener?.('change', h);
}
