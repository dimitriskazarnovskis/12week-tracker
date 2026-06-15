import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './store.svelte';
import { LocalStorageAdapter } from './storage/local';

beforeEach(() => localStorage.clear());

describe('store', () => {
  it('loads fresh data with null plan', async () => {
    const s = createStore(new LocalStorageAdapter(), null);
    await s.load();
    expect(s.data.plan).toBeNull();
    expect(s.status).toBe('ready');
  });
  it('toggleTask updates checks and persists', async () => {
    const s = createStore(new LocalStorageAdapter(), null); await s.load();
    s.setPlan({ planId: 'p', planVersion: 1, clientId: '', startDate: '2026-06-01',
      goals: [{ id: 'g1', name: 'G', emoji: '🎯', color: 'red', metricName: 'ER', metricTarget: 100 }],
      tactics: [{ id: 't1', goalId: 'g1', text: 'A' }], calendar: [] });
    await s.toggleTask(1, 't1');
    expect(s.data.progress.checks['1:t1']).toBe(true);
    const reloaded: any = await new LocalStorageAdapter().load();
    expect(reloaded.progress.checks['1:t1']).toBe(true);
  });
  it('saveKpi stores numeric value', async () => {
    const s = createStore(new LocalStorageAdapter(), null); await s.load();
    await s.saveKpi(2, 'g1', 7);
    expect(s.data.progress.kpis['2:g1']).toBe(7);
  });
});
