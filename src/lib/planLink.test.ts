import { describe, it, expect, vi } from 'vitest';
import { fetchPlanText, parseIncomingParam, extractParam } from './planLink';

// Шифруем тем же форматом, что генератор make-plan-link.mjs: iv (12 байт) | ciphertext | auth-tag.
async function encrypt(text: string) {
  const keyBytes = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const enc = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(text)));
  const blob = new Uint8Array(iv.length + enc.length);
  blob.set(iv); blob.set(enc, iv.length);
  const keyB64 = btoa(String.fromCharCode(...keyBytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { blob, keyB64 };
}

describe('planLink', () => {
  it('шифрование → расшифровка приложения (round-trip)', async () => {
    const secret = JSON.stringify({ app: 'kazarnovskis-dashboard', type: 'update', monthly: { '2026-08': { followers: 8600 } } });
    const { blob, keyB64 } = await encrypt(secret);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(blob)));
    const text = await fetchPlanText('AbCdEfGh12', keyB64, '/');
    expect(JSON.parse(text).monthly['2026-08'].followers).toBe(8600);
  });
  it('неверный ключ — понятная ошибка, не крэш', async () => {
    const { blob } = await encrypt('{"a":1}');
    const wrongKey = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(blob)));
    await expect(fetchPlanText('AbCdEfGh12', wrongKey, '/')).rejects.toThrow(/повреждена|неполная/);
  });
  it('extractParam принимает любую форму вставленной ссылки', () => {
    const param = 'AbCdEfGh12_' + 'k'.repeat(22);
    expect(extractParam('https://t.me/kazarnovskis_bot/dashboard?startapp=' + param)?.id).toBe('AbCdEfGh12');
    expect(extractParam('https://x.github.io/12week-tracker/#plan=' + param)?.key).toBe('k'.repeat(22));
    expect(extractParam('  ' + param + '  ')?.id).toBe('AbCdEfGh12'); // голый код с пробелами
    expect(extractParam('просто текст')).toBeNull();
    expect(extractParam('')).toBeNull();
  });
  it('parseIncomingParam читает #plan= из адресной строки', () => {
    location.hash = '#plan=AbCdEfGh12_' + 'k'.repeat(22);
    const p = parseIncomingParam();
    expect(p?.id).toBe('AbCdEfGh12');
    expect(p?.key).toBe('k'.repeat(22));
    location.hash = '';
    expect(parseIncomingParam()).toBeNull();
  });
});
