import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelegramCloudAdapter } from './telegram';
import { migrate } from '../migrations';

function mockCloud(opts: { failGet?: boolean; failSet?: boolean; silent?: boolean } = {}) {
  const mem: Record<string, string> = {};
  return {
    mem,
    api: {
      setItem: (k: string, v: string, cb?: Function) => {
        if (opts.silent) return;
        if (opts.failSet) { cb?.('ERR', false); return; }
        mem[k] = v; cb?.(null, true);
      },
      getItem: (k: string, cb: Function) => {
        if (opts.silent) return;
        if (opts.failGet) { cb('ERR', null); return; }
        cb(null, mem[k] ?? '');
      },
      getKeys: (cb: Function) => { if (!opts.silent) cb(null, Object.keys(mem)); },
      removeItems: (ks: string[], cb?: Function) => { if (opts.silent) return; ks.forEach(k => delete mem[k]); cb?.(null, true); },
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
  it('save rejects on oversized value and writes NOTHING (no partial state)', async () => {
    const c = mockCloud(); (globalThis as any).Telegram = { WebApp: { CloudStorage: c.api } };
    const d = migrate(null);
    d.progress.reflections['1'] = 'х'.repeat(5000); // > 4096 chars in one shard
    await expect(new TelegramCloudAdapter().save(d)).rejects.toThrow(/too-large/);
    expect(Object.keys(c.mem)).toHaveLength(0);
  });
  it('load rejects on read error instead of pretending cloud is empty', async () => {
    const c = mockCloud({ failGet: true }); (globalThis as any).Telegram = { WebApp: { CloudStorage: c.api } };
    await expect(new TelegramCloudAdapter().load()).rejects.toThrow();
  });
  it('save rejects when a write fails, and kd_meta is not updated', async () => {
    const good = mockCloud(); (globalThis as any).Telegram = { WebApp: { CloudStorage: good.api } };
    const a = new TelegramCloudAdapter();
    const d = migrate(null); await a.save(d);
    const metaBefore = good.mem['kd_meta'];
    const bad = mockCloud({ failSet: true }); bad.mem.kd_meta = metaBefore;
    (globalThis as any).Telegram = { WebApp: { CloudStorage: bad.api } };
    const d2 = migrate(null); d2.settings.theme = 'dark'; d2.meta.updatedAt = '2099-01-01T00:00:00.000Z';
    await expect(a.save(d2)).rejects.toThrow();
    expect(bad.mem['kd_meta']).toBe(metaBefore);
  });
  it('save skips (no-op) when cloud already holds NEWER data', async () => {
    const c = mockCloud(); (globalThis as any).Telegram = { WebApp: { CloudStorage: c.api } };
    const a = new TelegramCloudAdapter();
    const newer = migrate(null); newer.meta.updatedAt = '2099-01-01T00:00:00.000Z'; newer.settings.theme = 'dark';
    await a.save(newer);
    const older = migrate(null); older.meta.updatedAt = '2001-01-01T00:00:00.000Z'; older.settings.theme = 'light';
    await a.save(older); // must not clobber the newer snapshot
    expect(JSON.parse(c.mem['kd_settings']).theme).toBe('dark');
    expect(JSON.parse(c.mem['kd_meta']).updatedAt).toBe('2099-01-01T00:00:00.000Z');
  });
  it('load rejects on timeout (callback never fires) instead of returning null', async () => {
    vi.useFakeTimers();
    try {
      const c = mockCloud({ silent: true }); (globalThis as any).Telegram = { WebApp: { CloudStorage: c.api } };
      const p = new TelegramCloudAdapter().load();
      const assertion = expect(p).rejects.toThrow(/timeout/);
      await vi.advanceTimersByTimeAsync(3100);
      await assertion;
    } finally { vi.useRealTimers(); }
  });
  it('архив циклов: нарезается кусками ≤4096 и склеивается обратно', async () => {
    const c = mockCloud(); (globalThis as any).Telegram = { WebApp: { CloudStorage: c.api } };
    const a = new TelegramCloudAdapter();
    const d = migrate(null);
    d.archive = [{
      archivedAt: '2026-10-19T00:00:00.000Z',
      plan: { planId: 'p_old', planVersion: 1, clientId: '', startDate: '2026-07-27',
        goals: [{ id: 'g1', name: 'Ц'.repeat(400), emoji: '🎯', color: 'red', metricName: 'ER', metricTarget: 5 }],
        tactics: Array.from({ length: 12 }, (_, i) => ({ id: 't' + i, goalId: 'g1', text: 'Задача №' + i + ' — ' + 'х'.repeat(300) })),
        calendar: [] },
      progress: { checks: { '1:t1': true }, kpis: { '1:g1': 3 }, reflections: { '1': 'итог' } },
    }];
    await a.save(d);
    for (const v of Object.values(c.mem)) expect(v.length).toBeLessThanOrEqual(4096);
    expect(Object.keys(c.mem).filter(k => k.startsWith('kd_arch_')).length).toBeGreaterThan(1); // реально порезался
    const back: any = await a.load();
    expect(back.archive).toHaveLength(1);
    expect(back.archive[0].plan.planId).toBe('p_old');
    expect(back.archive[0].progress.checks['1:t1']).toBe(true);
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
