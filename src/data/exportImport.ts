import type { AppData } from './types';
import { migrate, CURRENT_VERSION } from './migrations';
import { isAppData } from './validate';
import { now } from '../lib/ids';

export function toExport(d: AppData, appVersion: string): string {
  return JSON.stringify({ app: 'kazarnovskis-dashboard', appVersion, schemaVersion: CURRENT_VERSION, exportedAt: now(), data: d }, null, 2);
}

function looksLikeExportOrAppData(parsed: any): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  if (parsed.data && typeof parsed.data === 'object') return parsed.app === 'kazarnovskis-dashboard';
  return !!(parsed.meta && parsed.progress && parsed.settings);
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
