import type { AppData } from './types';
import { migrate, CURRENT_VERSION } from './migrations';
import { isAppData } from './validate';
import { now } from '../lib/ids';

export function toExport(d: AppData, appVersion: string): string {
  return JSON.stringify({ app: 'kazarnovskis-dashboard', appVersion, schemaVersion: CURRENT_VERSION, exportedAt: now(), data: d }, null, 2);
}

function looksLikeExportOrAppData(parsed: any): boolean {
  // Accepts either a wrapped export ({ data: ... }) or a raw AppData ({ meta, progress, ... })
  if (parsed && typeof parsed === 'object') {
    if (parsed.data && typeof parsed.data === 'object') return true; // wrapped export
    if (parsed.meta && parsed.progress) return true;                 // raw AppData shape
  }
  return false;
}

export function fromImport(text: string): AppData {
  let parsed: any;
  try { parsed = JSON.parse(text); } catch { throw new Error('Файл повреждён: не читается'); }
  if (!looksLikeExportOrAppData(parsed)) throw new Error('Файл не похож на данные дашборда');
  const raw = parsed?.data ?? parsed;
  const migrated = migrate(raw);
  if (!isAppData(migrated)) throw new Error('Файл не похож на данные дашборда');
  return migrated;
}
