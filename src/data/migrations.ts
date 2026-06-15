import type { AppData } from './types';
import { emptyProgress } from './types';
import { now } from '../lib/ids';
import { isAppData } from './validate';

export const CURRENT_VERSION = 1;

function fresh(): AppData {
  const ts = now();
  return { meta: { schemaVersion: CURRENT_VERSION, createdAt: ts, updatedAt: ts },
    plan: null, progress: emptyProgress(), settings: { theme: 'auto', lang: 'ru' } };
}

const steps: Array<(d: any) => any> = [
  (legacy: any) => {
    const base = fresh();
    if (legacy && typeof legacy === 'object' && typeof legacy.startDate === 'string') {
      base.plan = { planId: 'legacy', planVersion: 1, clientId: '', startDate: legacy.startDate,
        goals: [], tactics: [], calendar: [] };
    }
    return base;
  },
];

export function migrate(raw: unknown): AppData {
  const ver = (raw as any)?.meta?.schemaVersion;
  if (ver === CURRENT_VERSION) {
    return isAppData(raw) ? (raw as AppData) : fresh();
  }
  let v = (typeof ver === 'number' && Number.isInteger(ver) && ver >= 0) ? Math.min(ver, CURRENT_VERSION) : 0;
  let data: any = raw ?? null;
  while (v < CURRENT_VERSION) { data = steps[v](data); v += 1; }
  if (!isAppData(data)) data = fresh();
  data.meta.schemaVersion = CURRENT_VERSION;
  data.meta.updatedAt = now();
  return data as AppData;
}
