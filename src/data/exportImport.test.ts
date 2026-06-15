import { describe, it, expect } from 'vitest';
import { toExport, fromImport } from './exportImport';
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
});
