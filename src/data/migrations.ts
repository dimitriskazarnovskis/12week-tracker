import type { AppData } from './types';
import { emptyProgress } from './types';
import { now } from '../lib/ids';

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
  if (raw && typeof raw === 'object' && (raw as any).meta?.schemaVersion === CURRENT_VERSION) {
    return raw as AppData;
  }
  let v = (raw as any)?.meta?.schemaVersion ?? 0;
  let data: any = raw ?? null;
  while (v < CURRENT_VERSION) { data = steps[v](data); v += 1; }
  data.meta.schemaVersion = CURRENT_VERSION;
  data.meta.updatedAt = now();
  return data as AppData;
}
