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
  it('cloud load failure with local data present → ready on local copy, баннер не пугает сразу', async () => {
    const seed = migrate(null); seed.settings.theme = 'dark';
    await new LocalStorageAdapter().save(seed);
    const s = createStore(new LocalStorageAdapter(), failingCloud());
    await s.load();
    expect(s.status).toBe('ready');
    expect(s.data.settings.theme).toBe('dark');
    expect(s.cloudOk).toBe(true); // одиночный сбой чтения — работаем дальше, автоповтор запланирован
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
  it('addGoal ограничен тремя; removeGoal убирает цель, её задачи, отметки и показатели', async () => {
    const s = createStore(new LocalStorageAdapter(), null); await s.load();
    s.setPlan({ planId: 'p', planVersion: 1, clientId: '', startDate: '2026-07-27',
      goals: [{ id: 'g1', name: 'Первая', emoji: '🎯', color: 'red', metricName: 'ER', metricTarget: 5 }],
      tactics: [{ id: 't1', goalId: 'g1', text: 'A' }], calendar: [] });
    const g2 = await s.addGoal(); const g3 = await s.addGoal();
    expect(g2 && g3).toBeTruthy();
    expect(await s.addGoal()).toBeNull(); // четвёртую нельзя
    await s.toggleTask(2, 't1');
    await s.saveKpi(2, 'g1', 4);
    await s.removeGoal('g1');
    expect(s.data.plan!.goals.map(g => g.id)).toEqual([g2, g3]);
    expect(s.data.plan!.tactics).toHaveLength(0);
    expect(s.data.progress.checks['2:t1']).toBeUndefined();
    expect(s.data.progress.kpis['2:g1']).toBeUndefined();
  });
  it('активация переживает «Сбросить всё»: контент стирается, доступ остаётся', async () => {
    const s = createStore(new LocalStorageAdapter(), null); await s.load();
    const d2 = migrate(null);
    d2.plan = { planId: 'p', planVersion: 1, clientId: '', clientName: 'Лейла', startDate: '2026-07-27', goals: [], tactics: [], calendar: [] };
    await s.importData(d2);
    expect(s.data.settings.activated).toBe(true); // импорт плана = пропуск
    await s.reset();
    expect(s.data.plan).toBeNull();               // контент стёрт
    expect(s.data.settings.activated).toBe(true); // но клиент остался «своим»
  });
  it('startNewCycle: прошлый цикл в архив, недели с нуля, цели по желанию переносятся', async () => {
    const s = createStore(new LocalStorageAdapter(), null); await s.load();
    s.setPlan({ planId: 'p_old', planVersion: 1, clientId: 'leyla', startDate: '2026-07-27',
      goals: [{ id: 'g1', name: 'Цель', emoji: '🎯', color: 'red', metricName: 'ER', metricTarget: 5 }],
      tactics: [{ id: 't1', goalId: 'g1', text: 'A' }],
      calendar: [{ id: 'c1', date: '2026-07-27', type: 'reel', title: 'X', status: 'published' }] });
    await s.toggleTask(3, 't1');
    await s.saveKpi(3, 'g1', 4);
    await s.startNewCycle('2026-10-19', true);
    expect(s.data.archive).toHaveLength(1);
    expect(s.data.archive![0].plan.planId).toBe('p_old');
    expect(s.data.archive![0].progress.checks['3:t1']).toBe(true);
    expect(s.data.plan!.planId).not.toBe('p_old');
    expect(s.data.plan!.startDate).toBe('2026-10-19');
    expect(s.data.plan!.goals).toHaveLength(1);      // цели перенесены
    expect(s.data.plan!.calendar).toHaveLength(0);   // контент-план нового цикла — новый
    expect(s.data.progress.checks).toEqual({});      // отметки с нуля
    await s.startNewCycle('2027-01-18', false);
    expect(s.data.archive).toHaveLength(2);
    expect(s.data.plan!.goals).toHaveLength(0);      // без переноса
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
  it('applyUpdate merges consultant data WITHOUT touching client checks', async () => {
    const s = createStore(new LocalStorageAdapter(), null); await s.load();
    s.setPlan({ planId: 'p', planVersion: 1, clientId: '', startDate: '2026-07-27',
      goals: [], tactics: [{ id: 't1', goalId: 'g1', text: 'A' }], calendar: [] });
    await s.toggleTask(1, 't1');
    await s.setMonthly('start', { followers: 8322 });
    await s.applyUpdate({
      monthly: { '2026-08': { followers: 8600, reach: 12000 } },
      calendarAdd: [{ date: '2026-08-27', type: 'reel', title: 'Новый Reel от консультанта' }],
    });
    expect(s.data.progress.checks['1:t1']).toBe(true); // отметки клиента целы
    expect(s.data.progress.monthly?.['start']?.followers).toBe(8322);
    expect(s.data.progress.monthly?.['2026-08']?.reach).toBe(12000);
    expect(s.data.plan!.calendar).toHaveLength(1);
    expect(s.data.plan!.calendar[0].status).toBe('planned');
  });
  it('importData/reset stash a backup; restoreBackup brings client data back (and is re-undoable)', async () => {
    const s = createStore(new LocalStorageAdapter(), null); await s.load();
    s.setPlan({ planId: 'p_client', planVersion: 1, clientId: '', startDate: '2026-07-27',
      goals: [{ id: 'g1', name: 'Цель клиента', emoji: '🎯', color: 'red', metricName: 'ER', metricTarget: 5 }],
      tactics: [{ id: 't1', goalId: 'g1', text: 'Её задача' }], calendar: [] });
    await s.toggleTask(1, 't1');
    expect(s.backupAt).toBeNull();

    const consultantPlan = migrate(null);
    consultantPlan.plan = { planId: 'p_new', planVersion: 1, clientId: '', startDate: '2026-08-03', goals: [], tactics: [], calendar: [] };
    await s.importData(consultantPlan);
    expect(s.data.plan!.planId).toBe('p_new');
    expect(s.backupAt).not.toBeNull();

    expect(await s.restoreBackup()).toBe(true);
    expect(s.data.plan!.planId).toBe('p_client');
    expect(s.data.progress.checks['1:t1']).toBe(true); // её отметки вернулись

    expect(await s.restoreBackup()).toBe(true); // отмена отмены
    expect(s.data.plan!.planId).toBe('p_new');

    await s.restoreBackup(); // назад к клиентским
    await s.reset();
    expect(s.data.plan).toBeNull();
    expect(await s.restoreBackup()).toBe(true); // и после сброса можно передумать
    expect(s.data.plan!.planId).toBe('p_client');
  });
  it('одиночный сбой облака НЕ показывает баннер; второй подряд — показывает; успех сбрасывает', async () => {
    let fail = true;
    const cloud: StorageAdapter = { load: async () => null, save: async () => { if (fail) throw new Error('x'); } };
    const s = createStore(new LocalStorageAdapter(), cloud);
    await s.load();
    await s.saveKpi(1, 'g1', 1);
    await s.flushNow();
    expect(s.cloudOk).toBe(true); // первый сбой — молчим, повторим сами
    await s.saveKpi(1, 'g1', 2);
    await s.flushNow();
    expect(s.cloudOk).toBe(false); // второй подряд — честный баннер
    fail = false;
    await s.saveKpi(1, 'g1', 3);
    await s.flushNow();
    expect(s.cloudOk).toBe(true); // связь вернулась — баннер ушёл
  });
});
