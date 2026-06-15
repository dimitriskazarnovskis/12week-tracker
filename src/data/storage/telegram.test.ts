import { describe, it, expect, beforeEach } from 'vitest';
import { TelegramCloudAdapter } from './telegram';
import { migrate } from '../migrations';

function mockCloud() {
  const mem: Record<string, string> = {};
  return {
    mem,
    api: {
      setItem: (k: string, v: string, cb?: Function) => { mem[k] = v; cb?.(null, true); },
      getItem: (k: string, cb: Function) => cb(null, mem[k] ?? ''),
      getKeys: (cb: Function) => cb(null, Object.keys(mem)),
      removeItems: (ks: string[], cb?: Function) => { ks.forEach(k => delete mem[k]); cb?.(null, true); },
    },
  };
}

beforeEach(() => { delete (globalThis as any).Telegram; });

describe('TelegramCloudAdapter', () => {
  it('shards plan/progress/settings and never exceeds 4096 chars per value', async () => {
    const c = mockCloud(); (globalThis as any).Telegram = { WebApp: { CloudStorage: c.api } };
    const d = migrate(null);
    d.plan = { planId: 'p', planVersion: 1, clientId: '', startDate: '2026-06-01',
      goals: Array.from({ length: 3 }, (_, i) => ({ id: 'g'+i, name: 'Goal '+i, emoji: '🎯', color: 'red' as const, metricName: 'ER', metricTarget: 100 })),
      tactics: [], calendar: Array.from({ length: 80 }, (_, i) => ({ id: 'c'+i, date: '2026-07-0'+(i%9+1), type: 'reel' as const, title: 'Post '+i, status: 'planned' as const })) };
    d.progress.checks['3:t1'] = true; d.progress.kpis['3:g0'] = 5;
    await new TelegramCloudAdapter().save(d);
    for (const v of Object.values(c.mem)) expect(v.length).toBeLessThanOrEqual(4096);
    expect(Object.keys(c.mem)).toContain('kd_meta');
    expect(Object.keys(c.mem).some(k => k.startsWith('kd_cal_'))).toBe(true);
  });
  it('reassembles sharded data on load', async () => {
    const c = mockCloud(); (globalThis as any).Telegram = { WebApp: { CloudStorage: c.api } };
    const d = migrate(null); d.settings.theme = 'dark'; d.progress.kpis['2:g0'] = 9;
    const a = new TelegramCloudAdapter(); await a.save(d);
    const back: any = await a.load();
    expect(back.settings.theme).toBe('dark');
    expect(back.progress.kpis['2:g0']).toBe(9);
  });
  it('load returns null when cloud empty', async () => {
    (globalThis as any).Telegram = { WebApp: { CloudStorage: mockCloud().api } };
    expect(await new TelegramCloudAdapter().load()).toBeNull();
  });
  it('deletes stale shards when data shrinks (no resurrection)', async () => {
    const c = mockCloud(); (globalThis as any).Telegram = { WebApp: { CloudStorage: c.api } };
    const a = new TelegramCloudAdapter();
    const d = migrate(null);
    d.plan = { planId: 'p', planVersion: 1, clientId: '', startDate: '2026-06-01',
      goals: [], tactics: [], calendar: [
        { id: 'e1', date: '2026-07-01', type: 'reel', title: 'A', status: 'planned' },
        { id: 'e2', date: '2026-07-02', type: 'reel', title: 'B', status: 'planned' } ] };
    d.progress.checks['3:t1'] = true;
    await a.save(d);
    // shrink: drop one calendar entry and the week-3 check
    d.plan.calendar = [{ id: 'e1', date: '2026-07-01', type: 'reel', title: 'A', status: 'planned' }];
    d.progress.checks['3:t1'] = false;
    await a.save(d);
    const back: any = await a.load();
    expect(back.plan.calendar.length).toBe(1);
    expect(back.progress.checks['3:t1']).toBeFalsy();
  });
  it('removes kd_plan when plan becomes null', async () => {
    const c = mockCloud(); (globalThis as any).Telegram = { WebApp: { CloudStorage: c.api } };
    const a = new TelegramCloudAdapter();
    const d = migrate(null);
    d.plan = { planId: 'p', planVersion: 1, clientId: '', startDate: '2026-06-01', goals: [], tactics: [], calendar: [] };
    await a.save(d);
    d.plan = null; await a.save(d);
    const back: any = await a.load();
    expect(back.plan).toBeNull();
    expect(Object.keys(c.mem)).not.toContain('kd_plan');
  });
  it('load skips a corrupt shard instead of throwing', async () => {
    const c = mockCloud(); (globalThis as any).Telegram = { WebApp: { CloudStorage: c.api } };
    const a = new TelegramCloudAdapter();
    const d = migrate(null); await a.save(d);
    c.mem['kd_prog_w5'] = '{not json';
    const back: any = await a.load();
    expect(back).not.toBeNull();
    expect(back.meta.schemaVersion).toBe(1);
  });
});
