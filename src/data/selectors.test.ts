import { describe, it, expect } from 'vitest';
import { weekScore, currentWeek, kpiProgress, overallStats, programState, weekRange, formatDay, lastKpi, programEndISO } from './selectors';
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
  it('programState distinguishes before / active / done', () => {
    expect(programState('2026-06-01', new Date(2026, 4, 20))).toBe('before'); // May 20 < start
    expect(programState('2026-06-01', new Date(2026, 5, 1))).toBe('active');  // day 0
    expect(programState('2026-06-01', new Date(2026, 7, 23))).toBe('active'); // day 83 = week 12
    expect(programState('2026-06-01', new Date(2026, 7, 24))).toBe('done');   // day 84
  });
  it('weekRange renders human dates', () => {
    expect(weekRange('2026-07-06', 1)).toBe('6–12 июля');
    expect(weekRange('2026-07-06', 4)).toBe('27 июля – 2 августа');
  });
  it('formatDay renders "14 июля · вт" and tolerates junk', () => {
    expect(formatDay('2026-07-14')).toBe('14 июля · вт');
    expect(formatDay('mystery')).toBe('mystery');
  });
  it('lastKpi returns the latest recorded value, 0 if never entered', () => {
    const d = structuredClone(base);
    expect(lastKpi(d, 'g1')).toBe(0);
    d.progress.kpis['2:g1'] = 3;
    d.progress.kpis['7:g1'] = 4.5;
    expect(lastKpi(d, 'g1')).toBe(4.5);
  });
  it('programEndISO = start + 83 days', () => {
    expect(programEndISO('2026-07-13')).toBe('2026-10-04');
  });
  it('overallStats computes averages over weeks with activity', () => {
    const d = structuredClone(base);
    d.progress.checks['1:t1'] = true; d.progress.checks['1:t2'] = true;
    d.progress.checks['2:t1'] = true;
    const s = overallStats(d);
    expect(s.weeksActive).toBe(2); expect(s.avgScore).toBe(75); expect(s.excellentWeeks).toBe(1);
  });
});
