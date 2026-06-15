import type { StorageAdapter } from './storage/adapter';
import type { AppData, Plan, ThemePref } from './types';
import { checkKey, kpiKey } from './types';
import { migrate } from './migrations';
import { now } from '../lib/ids';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export function createStore(local: StorageAdapter, cloud: StorageAdapter | null) {
  let data = $state<AppData>(migrate(null));
  let status = $state<Status>('idle');
  let error = $state<string | null>(null);

  async function persist() {
    data.meta.updatedAt = now();
    try { await local.save(data); } catch (e) { error = String(e); }
    if (cloud) { cloud.save(data).catch(() => {}); }
  }

  return {
    get data() { return data; },
    get status() { return status; },
    get error() { return error; },

    async load() {
      status = 'loading';
      try {
        let raw = await local.load();
        if (!raw && cloud) raw = await cloud.load();
        data = migrate(raw);
        status = 'ready';
        await local.save(data);
      } catch (e) { error = String(e); status = 'error'; }
    },
    setPlan(plan: Plan) { data.plan = plan; persist(); },
    async toggleTask(week: number, taskId: string) {
      const k = checkKey(week, taskId);
      data.progress.checks[k] = !data.progress.checks[k];
      await persist();
    },
    async saveKpi(week: number, goalId: string, value: number) {
      data.progress.kpis[kpiKey(week, goalId)] = value;
      await persist();
    },
    async setReflection(week: number, text: string) {
      data.progress.reflections[`${week}`] = text; await persist();
    },
    async setTheme(theme: ThemePref) { data.settings.theme = theme; await persist(); },
    async importData(d2: AppData) { data = d2; await persist(); },
    async reset() { data = migrate(null); await persist(); },
  };
}
export type Store = ReturnType<typeof createStore>;
