import type { AppData } from './types';

const CONTENT_TYPES = ['reel', 'carousel', 'story', 'post'];
const ENTRY_STATUSES = ['planned', 'ready', 'published'];

function isGoal(g: any): boolean {
  return !!g && typeof g === 'object' && typeof g.id === 'string' && typeof g.name === 'string'
    && typeof g.metricName === 'string' && typeof g.metricTarget === 'number';
}
function isTactic(t: any): boolean {
  return !!t && typeof t === 'object' && typeof t.id === 'string' && typeof t.goalId === 'string' && typeof t.text === 'string';
}
function isCalendarEntry(e: any): boolean {
  return !!e && typeof e === 'object' && typeof e.id === 'string' && typeof e.date === 'string'
    && CONTENT_TYPES.includes(e.type) && typeof e.title === 'string' && ENTRY_STATUSES.includes(e.status);
}
function isPlan(p: any): boolean {
  return !!p && typeof p === 'object' && typeof p.startDate === 'string'
    && Array.isArray(p.goals) && p.goals.every(isGoal)
    && Array.isArray(p.tactics) && p.tactics.every(isTactic)
    && Array.isArray(p.calendar) && p.calendar.every(isCalendarEntry);
}

export function isAppData(v: unknown): v is AppData {
  if (!v || typeof v !== 'object') return false;
  const d = v as any;
  if (!d.meta || typeof d.meta.schemaVersion !== 'number') return false;
  if (!d.progress || typeof d.progress !== 'object') return false;
  if (!d.progress.checks || typeof d.progress.checks !== 'object') return false;
  if (!d.progress.kpis || typeof d.progress.kpis !== 'object') return false;
  if (!d.progress.reflections || typeof d.progress.reflections !== 'object') return false;
  if (d.progress.monthly != null && typeof d.progress.monthly !== 'object') return false;
  if (!d.settings || typeof d.settings.theme !== 'string') return false;
  if (d.plan !== null && !isPlan(d.plan)) return false;
  if (d.archive != null && !(Array.isArray(d.archive)
    && d.archive.every((c: any) => c && isPlan(c.plan) && c.progress && typeof c.progress === 'object'))) return false;
  return true;
}
