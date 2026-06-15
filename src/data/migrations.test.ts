import { describe, it, expect } from 'vitest';
import { migrate, CURRENT_VERSION } from './migrations';
import { isAppData } from './validate';

describe('migrations + validate', () => {
  it('fresh empty -> current version valid AppData', () => {
    const d = migrate(null);
    expect(d.meta.schemaVersion).toBe(CURRENT_VERSION);
    expect(isAppData(d)).toBe(true);
    expect(d.plan).toBeNull();
  });
  it('migrates legacy v0 prototype blob (index-keyed) without crashing', () => {
    const legacy = { startDate: '2026-06-01', goals: [{ name: 'G', emoji: '🎯', color: 'red' }], checks: { '1-g0t0': true } };
    const d = migrate(legacy);
    expect(d.meta.schemaVersion).toBe(CURRENT_VERSION);
    expect(isAppData(d)).toBe(true);
  });
  it('passes through already-current data unchanged in version', () => {
    const cur = migrate(null); cur.settings.theme = 'dark';
    const again = migrate(cur);
    expect(again.settings.theme).toBe('dark');
    expect(again.meta.schemaVersion).toBe(CURRENT_VERSION);
  });
  it('rejects garbage via validator', () => {
    expect(isAppData(42)).toBe(false);
    expect(isAppData({})).toBe(false);
  });
});
