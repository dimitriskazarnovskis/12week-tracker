import type { AppData, ID, MonthlyReport } from './types';
import { WEEKS, checkKey } from './types';

export function tacticsForGoal(d: AppData, goalId: ID) {
  return d.plan ? d.plan.tactics.filter(t => t.goalId === goalId) : [];
}
export function weekScore(d: AppData, week: number): number {
  const tactics = d.plan?.tactics ?? [];
  if (tactics.length === 0) return 0;
  const done = tactics.filter(t => d.progress.checks[checkKey(week, t.id)]).length;
  return Math.round((done / tactics.length) * 100);
}
// Day difference on local calendar days. Math.round absorbs DST's 23/25-hour days,
// so week boundaries stay at local midnight all year.
function daysSince(startDate: string, now: Date): number {
  const start = new Date(startDate + 'T00:00:00');
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((nowMid.getTime() - start.getTime()) / 86400000);
}
export function currentWeek(startDate: string, now: Date): number {
  const wk = Math.floor(daysSince(startDate, now) / 7) + 1;
  return Math.min(WEEKS, Math.max(1, wk));
}
export type ProgramState = 'before' | 'active' | 'done';
export function programState(startDate: string, now: Date): ProgramState {
  const d = daysSince(startDate, now);
  if (d < 0) return 'before';
  return d >= WEEKS * 7 ? 'done' : 'active';
}
// Ближайший понедельник (сегодня, если понедельник) — дата старта по умолчанию.
export function nextMondayISO(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const add = d.getDay() === 1 ? 0 : ((8 - d.getDay()) % 7 || 7);
  d.setDate(d.getDate() + add);
  return todayISO(d);
}
// Сегодняшняя дата в локальном ISO (для «Сегодня 23 июля» и т.п.)
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
// Номер недели программы для произвольной даты; БЕЗ клампа (может быть <1 и >12) — для группировки календаря.
export function weekOfDate(startDate: string, iso: string): number {
  return Math.floor(daysSince(startDate, new Date(iso + 'T00:00:00')) / 7) + 1;
}
const RU_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const RU_DAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
export function formatDay(iso: string, withWeekday = true): string {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  const base = `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
  return withWeekday ? `${base} · ${RU_DAYS[d.getDay()]}` : base;
}
// Последнее записанное значение показателя (неделя 12 → 1); 0, если ни разу не вводили.
export function lastKpi(d: AppData, goalId: ID): number {
  for (let w = WEEKS; w >= 1; w--) {
    const v = d.progress.kpis[`${w}:${goalId}`];
    if (v != null) return v;
  }
  return 0;
}
// ISO-дата последнего (84-го) дня программы.
export function programEndISO(startDate: string): string {
  const d = new Date(startDate + 'T00:00:00');
  d.setDate(d.getDate() + WEEKS * 7 - 1);
  const c = new Date(d); c.setMinutes(c.getMinutes() - c.getTimezoneOffset());
  return c.toISOString().slice(0, 10);
}
// Месяцы программы для вкладки «Отчёт»: 'start' (точка А) + календарные месяцы от старта до сегодня.
export function reportMonths(startDate: string, now: Date): string[] {
  const out = ['start'];
  const start = new Date(startDate + 'T00:00:00');
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  while (cur <= end && out.length <= 13) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}
export function monthLabel(key: string): string {
  if (key === 'start') return 'Точка А (старт)';
  const [y, m] = key.split('-').map(Number);
  const names = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return `${names[m - 1]} ${y}`;
}
// «Здоровье роста» 0–100 — формулы из Ergebnis-Dashboard (Dashboard_Anleitung.md):
// среднее четырёх под-метрик, каждая нормируется к своему «отличному» порогу.
export function growthHealth(rep: MonthlyReport, prev?: MonthlyReport): number | null {
  const { reach = 0, likes = 0, comments = 0, saves = 0, followers = 0 } = rep;
  if (reach <= 0) return null;
  const interactions = likes + comments + saves;
  const pct = (v: number, top: number) => Math.max(0, Math.min(100, (v / top) * 100));
  const er = pct(interactions / reach * 100, 4);                                   // реакции на охват, 100 при 4%
  const c2l = likes > 0 ? pct(comments / likes * 100, 3) : 0;                      // комментарии к лайкам, 100 при 3%
  const thoughtful = interactions > 0 ? pct((saves + comments) / interactions * 100, 20) : 0; // вдумчивые реакции, 100 при 20%
  const newFollowers = prev?.followers != null ? Math.max(0, followers - prev.followers) : 0;
  const f2r = pct(newFollowers / reach * 100, 0.6);                                // охват → подписка, 100 при 0.6%
  return Math.round((er + c2l + thoughtful + f2r) / 4);
}
export function weekRange(startDate: string, week: number): string {
  const a = new Date(startDate + 'T00:00:00');
  a.setDate(a.getDate() + (week - 1) * 7);
  const b = new Date(a); b.setDate(b.getDate() + 6);
  const dm = (d: Date) => `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${dm(b)}` : `${dm(a)} – ${dm(b)}`;
}
export function kpiProgress(value: number, target: number): number {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}
export function overallStats(d: AppData) {
  const scores = Array.from({ length: WEEKS }, (_, i) => weekScore(d, i + 1));
  const active = scores.filter(s => s > 0);
  const avgScore = active.length ? Math.round(active.reduce((a, b) => a + b, 0) / active.length) : 0;
  return { weeksActive: active.length, avgScore, excellentWeeks: scores.filter(s => s >= 85).length, scores };
}
