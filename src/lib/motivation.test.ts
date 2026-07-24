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
  it('совет недели: есть всегда, стабилен для недели, меняется между неделями', () => {
    const a = pickWeekFeedback('Лейла', 3, 90);
    expect(a.tip.length).toBeGreaterThan(10);
    expect(pickWeekFeedback('Лейла', 3, 20).tip).toBe(a.tip); // совет привязан к неделе, не к результату
    expect(pickWeekFeedback('Лейла', 4, 90).tip).not.toBe(a.tip);
  });
  it('правило Дмитрия: в текстах нет длинных тире', () => {
    for (let w = 1; w <= 12; w++) for (const s of [95, 60, 10]) {
      const f = pickWeekFeedback('Лейла', w, s);
      expect(f.title + f.text + f.tip).not.toContain('—');
    }
  });
});
