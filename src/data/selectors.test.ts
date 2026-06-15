import { describe, it, expect } from 'vitest';
import { weekScore, currentWeek, kpiProgress, overallStats } from './selectors';
import type { AppData } from './types';
import { emptyProgress } from './types';

const base: AppData = {
  meta: { schemaVersion: 1, createdAt: 'x', updatedAt: 'x' },
  plan: { planId: 'p', planVersion: 1, clientId: 'c', startDate: '2026-06-01',
    goals: [{ id: 'g1', name: 'G', emoji: '🎯', color: 'red', metricName: 'ER', metricTarget: 100 }],
    tactics: [{ id: 't1', goalId: 'g1', text: 'A' }, { id: 't2', goalId: 'g1', text: 'B' }],
    calendar: [] },
  progress: emptyProgress(),
  settings: { theme: 'auto', lang: 'ru' },
};

describe('selectors', () => {
  it('weekScore = % of tactics checked', () => {
    const d = structuredClone(base); d.progress.checks['1:t1'] = true;
    expect(weekScore(d, 1)).toBe(50);
    d.progress.checks['1:t2'] = true;
    expect(weekScore(d, 1)).toBe(100);
    expect(weekScore(d, 2)).toBe(0);
  });
  it('weekScore is 0 when no tactics', () => {
    const d = structuredClone(base); d.plan!.tactics = [];
    expect(weekScore(d, 1)).toBe(0);
  });
  it('currentWeek clamps to 1..12', () => {
    expect(currentWeek('2026-06-01', new Date('2026-06-01'))).toBe(1);
    expect(currentWeek('2026-06-01', new Date('2026-06-15'))).toBe(3);
    expect(currentWeek('2026-06-01', new Date('2025-01-01'))).toBe(1);
    expect(currentWeek('2026-06-01', new Date('2030-01-01'))).toBe(12);
  });
  it('kpiProgress caps at 100', () => {
    expect(kpiProgress(50, 100)).toBe(50);
    expect(kpiProgress(150, 100)).toBe(100);
    expect(kpiProgress(5, 0)).toBe(0);
  });
  it('overallStats computes averages over weeks with activity', () => {
    const d = structuredClone(base);
    d.progress.checks['1:t1'] = true; d.progress.checks['1:t2'] = true;
    d.progress.checks['2:t1'] = true;
    const s = overallStats(d);
    expect(s.weeksActive).toBe(2); expect(s.avgScore).toBe(75); expect(s.excellentWeeks).toBe(1);
  });
});
