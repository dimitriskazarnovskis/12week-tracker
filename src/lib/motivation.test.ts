import { describe, it, expect } from 'vitest';
import { pickWeekFeedback } from './motivation';

describe('pickWeekFeedback', () => {
  it('три тона по порогам 85 и 50, имя подставляется', () => {
    expect(pickWeekFeedback('Лейла', 1, 100).tone).toBe('great');
    expect(pickWeekFeedback('Лейла', 1, 85).tone).toBe('great');
    expect(pickWeekFeedback('Лейла', 1, 60).tone).toBe('good');
    expect(pickWeekFeedback('Лейла', 1, 20).tone).toBe('low');
    expect(pickWeekFeedback('Лейла', 1, 100).title).toContain('Лейла');
  });
  it('детерминированный выбор и разные фразы у разных недель', () => {
    const a = pickWeekFeedback('Лейла', 1, 90);
    expect(pickWeekFeedback('Лейла', 1, 90).title).toBe(a.title); // стабильно
    expect(pickWeekFeedback('Лейла', 2, 90).title).not.toBe(a.title); // неделя 2 — другая фраза
  });
  it('в тексте есть номер недели и процент; без имени не ломается', () => {
    const f = pickWeekFeedback(null, 7, 42);
    expect(f.text).toContain('Неделя 7');
    expect(f.text).toContain('42%');
    expect(f.title.length).toBeGreaterThan(3);
  });
});
