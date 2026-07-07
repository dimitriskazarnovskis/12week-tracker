import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './store.svelte';
import { LocalStorageAdapter } from './storage/local';
import { migrate } from './migrations';
import type { StorageAdapter } from './storage/adapter';

beforeEach(() => localStorage.clear());

function failingCloud(): StorageAdapter {
  return { load: async () => { throw new Error('cloud-timeout'); }, save: async () => { throw new Error('cloud-timeout'); } };
}
function memoryCloud() {
  const box: { stored: any } = { stored: null };
  const adapter: StorageAdapter = { load: async () => box.stored, save: async (d) => { box.stored = JSON.parse(JSON.stringify(d)); } };
  return { adapter, box };
}

describe('store', () => {
  it('loads fresh data with null plan', async () => {
    const s = createStore(new LocalStorageAdapter(), null);
    await s.load();
    expect(s.data.plan).toBeNull();
    expect(s.status).toBe('ready');
  });
  it('toggleTask updates checks and persists', async () => {
    const s = createStore(new LocalStorageAdapter(), null); await s.load();
    s.setPlan({ planId: 'p', planVersion: 1, clientId: '', startDate: '2026-06-01',
      goals: [{ id: 'g1', name: 'G', emoji: '🎯', color: 'red', metricName: 'ER', metricTarget: 100 }],
      tactics: [{ id: 't1', goalId: 'g1', text: 'A' }], calendar: [] });
    await s.toggleTask(1, 't1');
    expect(s.data.progress.checks['1:t1']).toBe(true);
    const reloaded: any = await new LocalStorageAdapter().load();
    expect(reloaded.progress.checks['1:t1']).toBe(true);
  });
  it('saveKpi stores numeric value', async () => {
    const s = createStore(new LocalStorageAdapter(), null); await s.load();
    await s.saveKpi(2, 'g1', 7);
    expect(s.data.progress.kpis['2:g1']).toBe(7);
  });
  it('cloud load failure with local data present → ready on local copy, cloudOk=false', async () => {
    const seed = migrate(null); seed.settings.theme = 'dark';
    await new LocalStorageAdapter().save(seed);
    const s = createStore(new LocalStorageAdapter(), failingCloud());
    await s.load();
    expect(s.status).toBe('ready');
    expect(s.data.settings.theme).toBe('dark');
    expect(s.cloudOk).toBe(false);
  });
  it('cloud load failure with NO local data → error screen, never the setup wizard', async () => {
    const s = createStore(new LocalStorageAdapter(), failingCloud());
    await s.load();
    expect(s.status).toBe('error');
  });
  it('cloud saves are debounced; flushNow forces the pending write', async () => {
    const { adapter, box } = memoryCloud();
    const s = createStore(new LocalStorageAdapter(), adapter);
    await s.load();
    await s.saveKpi(1, 'g1', 5);
    expect(box.stored).toBeNull(); // still debounced
    await s.flushNow();
    expect(box.stored?.progress?.kpis?.['1:g1']).toBe(5);
  });
  it('goal and tactic editing persists; removing a tactic cleans its checks', async () => {
    const s = createStore(new LocalStorageAdapter(), null); await s.load();
    s.setPlan({ planId: 'p', planVersion: 1, clientId: '', startDate: '2026-06-01',
      goals: [{ id: 'g1', name: 'Старое имя', emoji: '🎯', color: 'red', metricName: 'ER', metricTarget: 5 }],
      tactics: [{ id: 't1', goalId: 'g1', text: 'A' }], calendar: [] });
    await s.updateGoal('g1', { name: 'Новое имя', metricTarget: 10 });
    expect(s.data.plan!.goals[0].name).toBe('Новое имя');
    expect(s.data.plan!.goals[0].metricTarget).toBe(10);
    await s.setTacticText('t1', 'B');
    expect(s.data.plan!.tactics[0].text).toBe('B');
    await s.addTacticTo('g1', 'C');
    expect(s.data.plan!.tactics).toHaveLength(2);
    await s.toggleTask(3, 't1');
    expect(s.data.progress.checks['3:t1']).toBe(true);
    await s.removeTactic('t1');
    expect(s.data.plan!.tactics).toHaveLength(1);
    expect(s.data.progress.checks['3:t1']).toBeUndefined();
    const reloaded: any = await new LocalStorageAdapter().load();
    expect(reloaded.plan.goals[0].name).toBe('Новое имя');
  });
  it('calendar entries: add / update / remove persist', async () => {
    const s = createStore(new LocalStorageAdapter(), null); await s.load();
    s.setPlan({ planId: 'p', planVersion: 1, clientId: '', startDate: '2026-06-01', goals: [], tactics: [], calendar: [] });
    await s.addCalendarEntry({ date: '2026-07-14', type: 'reel', title: 'Анонс', status: 'planned' });
    const id = s.data.plan!.calendar[0].id;
    await s.updateCalendarEntry(id, { status: 'ready' });
    expect(s.data.plan!.calendar[0].status).toBe('ready');
    await s.removeCalendarEntry(id);
    expect(s.data.plan!.calendar).toHaveLength(0);
  });
  it('cloud save failure flips cloudOk to false', async () => {
    const cloud: StorageAdapter = { load: async () => null, save: async () => { throw new Error('x'); } };
    const s = createStore(new LocalStorageAdapter(), cloud);
    await s.load();
    expect(s.cloudOk).toBe(true);
    await s.saveKpi(1, 'g1', 1);
    await s.flushNow();
    expect(s.cloudOk).toBe(false);
  });
});
