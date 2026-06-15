import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from './local';
import { migrate } from '../migrations';

beforeEach(() => localStorage.clear());

describe('LocalStorageAdapter', () => {
  it('returns null when empty', async () => {
    expect(await new LocalStorageAdapter().load()).toBeNull();
  });
  it('round-trips AppData', async () => {
    const a = new LocalStorageAdapter(); const d = migrate(null); d.settings.theme = 'dark';
    await a.save(d);
    const back: any = await a.load();
    expect(back.settings.theme).toBe('dark');
  });
});
