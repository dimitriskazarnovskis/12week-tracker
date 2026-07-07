import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tg, dialogs } from './telegram';

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

describe('dialogs', () => {
  it('uses Telegram showConfirm when the client supports it (never window.confirm)', async () => {
    const showConfirm = vi.fn((_m: string, cb: (ok: boolean) => void) => cb(true));
    (globalThis as any).Telegram = { WebApp: { showConfirm, isVersionAtLeast: () => true } };
    const winConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await expect(dialogs.confirm('да?')).resolves.toBe(true);
    expect(showConfirm).toHaveBeenCalled();
    expect(winConfirm).not.toHaveBeenCalled();
    winConfirm.mockRestore();
  });
  it('falls back to window.confirm in a plain browser', async () => {
    const winConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await expect(dialogs.confirm('да?')).resolves.toBe(true);
    expect(winConfirm).toHaveBeenCalled();
    winConfirm.mockRestore();
  });
  it('alert resolves via Telegram showAlert when supported', async () => {
    const showAlert = vi.fn((_m: string, cb: () => void) => cb());
    (globalThis as any).Telegram = { WebApp: { showAlert, showConfirm: () => {}, isVersionAtLeast: () => true } };
    await expect(dialogs.alert('привет')).resolves.toBeUndefined();
    expect(showAlert).toHaveBeenCalled();
  });
});
