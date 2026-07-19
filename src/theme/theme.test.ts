import { describe, it, expect } from 'vitest';
import { resolveTheme } from './theme.svelte';

describe('resolveTheme', () => {
  it('light is the default: everything except dark resolves to light', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('auto', 'dark')).toBe('light'); // легаси-«авто» из старых данных = светлая
    expect(resolveTheme('auto', 'light')).toBe('light');
  });
  it('dark only when explicitly chosen', () => {
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });
});
