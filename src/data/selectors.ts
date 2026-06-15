import type { AppData, ID } from './types';
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
export function currentWeek(startDate: string, now: Date): number {
  const start = new Date(startDate + 'T00:00:00');
  const ms = now.getTime() - start.getTime();
  const wk = Math.floor(ms / (7 * 24 * 3600 * 1000)) + 1;
  return Math.min(WEEKS, Math.max(1, wk));
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
