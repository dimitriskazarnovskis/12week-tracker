import { describe, it, expect } from 'vitest';
import { toExport, fromImport, parseImportFile } from './exportImport';
import { migrate, CURRENT_VERSION } from './migrations';

describe('export/import', () => {
  it('export wraps data with version + timestamp', () => {
    const d = migrate(null); d.settings.theme = 'dark';
    const out = JSON.parse(toExport(d, '1.0.0'));
    expect(out.schemaVersion).toBe(CURRENT_VERSION);
    expect(out.app).toBe('kazarnovskis-dashboard');
    expect(out.data.settings.theme).toBe('dark');
  });
  it('import validates + migrates', () => {
    const d = migrate(null); const text = toExport(d, '1.0.0');
    const back = fromImport(text);
    expect(back.meta.schemaVersion).toBe(CURRENT_VERSION);
  });
  it('import throws on garbage', () => {
    expect(() => fromImport('not json')).toThrow();
    expect(() => fromImport('{"foo":1}')).toThrow();
  });
  it('rejects wrapped object without app field', () => {
    expect(() => fromImport('{"data":{}}')).toThrow();
  });
  it('rejects an export whose plan is structurally broken (would white-screen the app)', () => {
    const d: any = migrate(null);
    d.plan = { startDate: '2026-06-01' }; // not a real plan
    const text = JSON.stringify({ app: 'kazarnovskis-dashboard', schemaVersion: CURRENT_VERSION, data: d });
    expect(() => fromImport(text)).toThrow(/повреждён|версией/i);
  });
  it('parseImportFile: распознаёт файл-обновление и полный план', () => {
    const upd = JSON.stringify({ app: 'kazarnovskis-dashboard', type: 'update',
      monthly: { '2026-08': { followers: 8600 } },
      calendarAdd: [{ date: '2026-08-27', type: 'reel', title: 'Новый Reel' }] });
    const r = parseImportFile(upd);
    expect(r.kind).toBe('update');
    if (r.kind === 'update') expect(r.update.monthly?.['2026-08']?.followers).toBe(8600);
    const full = parseImportFile(toExport(migrate(null), '1.3.0'));
    expect(full.kind).toBe('full');
  });
  it('parseImportFile: битое обновление отклоняется', () => {
    const bad = JSON.stringify({ app: 'kazarnovskis-dashboard', type: 'update',
      calendarAdd: [{ date: '2026-08-27', type: 'tiktok-dance', title: 'X' }] });
    expect(() => parseImportFile(bad)).toThrow();
  });
  it('rejects an export from a NEWER app version with a clear message', () => {
    const text = JSON.stringify({ app: 'kazarnovskis-dashboard', schemaVersion: 99, data: { meta: { schemaVersion: 99 }, progress: {}, settings: {} } });
    expect(() => fromImport(text)).toThrow(/версией/i);
  });
});
