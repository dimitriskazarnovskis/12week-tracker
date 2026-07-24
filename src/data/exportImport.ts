import type { AppData, CalendarEntry, MonthlyReport } from './types';
import { migrate, CURRENT_VERSION } from './migrations';
import { isAppData } from './validate';
import { now } from '../lib/ids';

// Файл-обновление от консультанта: сливается с данными клиента, ничего не стирая.
export interface ConsultantUpdate {
  monthly?: Record<string, MonthlyReport>;
  calendarAdd?: Array<Omit<CalendarEntry, 'id' | 'status'> & { status?: CalendarEntry['status'] }>;
  note?: string;
}
export type ImportResult =
  | { kind: 'full'; data: AppData }
  | { kind: 'update'; update: ConsultantUpdate };

const CONTENT_TYPES = ['reel', 'carousel', 'story', 'post'];
function isConsultantUpdate(p: any): boolean {
  if (p?.app !== 'kazarnovskis-dashboard' || p?.type !== 'update') return false;
  if (p.monthly != null && typeof p.monthly !== 'object') return false;
  if (p.calendarAdd != null && !(Array.isArray(p.calendarAdd)
    && p.calendarAdd.every((e: any) => e && typeof e.date === 'string' && typeof e.title === 'string' && CONTENT_TYPES.includes(e.type)))) return false;
  return p.monthly != null || p.calendarAdd != null;
}

export function toExport(d: AppData, appVersion: string): string {
  return JSON.stringify({ app: 'kazarnovskis-dashboard', appVersion, schemaVersion: CURRENT_VERSION, exportedAt: now(), data: d }, null, 2);
}

function looksLikeExportOrAppData(parsed: any): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  if (parsed.data && typeof parsed.data === 'object') return parsed.app === 'kazarnovskis-dashboard';
  return !!(parsed.meta && parsed.progress && parsed.settings);
}

// Универсальный разбор файла: полный план (замена) или обновление от консультанта (слияние).
export function parseImportFile(text: string): ImportResult {
  let parsed: any;
  try { parsed = JSON.parse(text); } catch { throw new Error('Файл повреждён: не читается'); }
  if (isConsultantUpdate(parsed)) {
    return { kind: 'update', update: { monthly: parsed.monthly, calendarAdd: parsed.calendarAdd, note: parsed.note } };
  }
  return { kind: 'full', data: fromImport(text) };
}

export function fromImport(text: string): AppData {
  let parsed: any;
  try { parsed = JSON.parse(text); } catch { throw new Error('Файл повреждён: не читается'); }
  if (!looksLikeExportOrAppData(parsed)) throw new Error('Файл не похож на данные дашборда');
  const raw = parsed?.data ?? parsed;
  let migrated: AppData;
  try { migrated = migrate(raw); }
  catch (e) {
    throw new Error(e instanceof Error && e.message === 'newer-schema'
      ? 'Файл создан более новой версией приложения. Сначала обновите приложение'
      : 'Файл повреждён: данные внутри не читаются');
  }
  if (!isAppData(migrated)) throw new Error('Файл не похож на данные дашборда');
  return migrated;
}
