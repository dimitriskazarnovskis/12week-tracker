import type { ThemePref } from '../data/types';
export type Scheme = 'light' | 'dark';

export function resolveTheme(pref: ThemePref, system: Scheme): Scheme {
  return pref === 'auto' ? system : pref;
}
export function applyTheme(scheme: Scheme) {
  document.documentElement.setAttribute('data-theme', scheme);
}
