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
  it('REFUSES data from a newer schema version instead of silently downgrading/wiping', () => {
    expect(() => migrate({ meta: { schemaVersion: 99 } })).toThrow('newer-schema');
  });
  it('still tolerates garbage/negative versions by producing fresh data', () => {
    expect(() => migrate({ meta: { schemaVersion: -3 } })).not.toThrow();
    expect(isAppData(migrate({ meta: { schemaVersion: -3 } }))).toBe(true);
  });
  it('REFUSES current-version data with a structurally broken plan (no white screen, no wipe)', () => {
    const bad = migrate(null) as any;
    bad.plan = { startDate: '2026-06-01' }; // goals/tactics/calendar arrays missing
    expect(() => migrate(bad)).toThrow('corrupt-data');
  });
  it('deep-validates plan interior', () => {
    const d = migrate(null) as any;
    d.plan = { planId: 'p', planVersion: 1, clientId: '', startDate: '2026-06-01',
      goals: [{ id: 'g1', name: 'G', emoji: '🎯', color: 'red', metricName: 'ER', metricTarget: 5 }],
      tactics: [{ id: 't1', goalId: 'g1', text: 'A' }],
      calendar: [{ id: 'c1', date: '2026-07-01', type: 'reel', title: 'A', status: 'planned' }] };
    expect(isAppData(d)).toBe(true);
    d.plan.calendar[0].type = 'tiktok-dance'; // unknown content type
    expect(isAppData(d)).toBe(false);
  });
});
