import { describe, it, expect, beforeEach } from 'vitest';
import { tg } from './telegram';

beforeEach(() => { (globalThis as any).window = globalThis as any; delete (globalThis as any).Telegram; });

describe('telegram shim', () => {
  it('reports colorScheme light when SDK absent', () => {
    expect(tg().colorScheme()).toBe('light');
  });
  it('reads colorScheme from SDK when present', () => {
    (globalThis as any).Telegram = { WebApp: { colorScheme: 'dark', ready(){}, expand(){} } };
    expect(tg().colorScheme()).toBe('dark');
  });
  it('haptic does not throw when SDK absent', () => {
    expect(() => tg().haptic('light')).not.toThrow();
  });
});
