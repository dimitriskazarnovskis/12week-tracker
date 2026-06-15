import { describe, it, expect } from 'vitest';
import { resolveTheme } from './theme.svelte';

describe('resolveTheme', () => {
  it('auto follows system scheme', () => {
    expect(resolveTheme('auto', 'dark')).toBe('dark');
    expect(resolveTheme('auto', 'light')).toBe('light');
  });
  it('manual overrides system', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });
});
