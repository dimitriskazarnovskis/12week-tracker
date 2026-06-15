import { describe, it, expect } from 'vitest';
import { genId, setClock, now } from './ids';

describe('ids', () => {
  it('generates unique ids', () => {
    const a = genId('g'); const b = genId('g');
    expect(a).not.toBe(b); expect(a.startsWith('g_')).toBe(true);
  });
  it('clock is injectable', () => {
    setClock(() => '2026-06-15T00:00:00.000Z');
    expect(now()).toBe('2026-06-15T00:00:00.000Z');
  });
});
