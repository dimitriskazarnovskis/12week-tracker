import type { ThemePref } from '../data/types';
export type Scheme = 'light' | 'dark';

// Shared reactive system scheme (from Telegram / OS). Updated on theme changes
// so logos and theme-aware UI re-render live, not just on manual toggle.
export const sys = $state<{ scheme: Scheme }>({ scheme: 'light' });

export function resolveTheme(pref: ThemePref, system: Scheme): Scheme {
  return pref === 'auto' ? system : pref;
}
export function applyTheme(scheme: Scheme) {
  document.documentElement.setAttribute('data-theme', scheme);
}
