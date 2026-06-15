import type { AppData } from './types';

export function isAppData(v: unknown): v is AppData {
  if (!v || typeof v !== 'object') return false;
  const d = v as any;
  if (!d.meta || typeof d.meta.schemaVersion !== 'number') return false;
  if (!d.progress || typeof d.progress !== 'object') return false;
  if (!d.progress.checks || !d.progress.kpis || !d.progress.reflections) return false;
  if (!d.settings || typeof d.settings.theme !== 'string') return false;
  if (d.plan !== null && typeof d.plan !== 'object') return false;
  return true;
}
