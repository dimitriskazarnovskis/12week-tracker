// Персональные ссылки: план/обновление клиента лежит зашифрованным (AES-GCM) в public/plans/<id>.bin,
// ключ расшифровки — только внутри ссылки (?startapp=<id>_<ключ>). Хранилище публичное, содержимое — нет.
const ID_LEN = 10;

export function parseIncomingParam(): { id: string; key: string } | null {
  const wa = (globalThis as any)?.Telegram?.WebApp;
  const raw: string = wa?.initDataUnsafe?.start_param
    || new URLSearchParams(location.search).get('tgWebAppStartParam')
    || (location.hash.startsWith('#plan=') ? location.hash.slice(6) : '');
  if (!raw || raw.length < ID_LEN + 2 || raw[ID_LEN] !== '_') return null;
  const id = raw.slice(0, ID_LEN);
  const key = raw.slice(ID_LEN + 1);
  if (!/^[A-Za-z0-9]+$/.test(id) || !/^[A-Za-z0-9_-]+$/.test(key)) return null;
  return { id, key };
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

export async function fetchPlanText(id: string, key: string, baseUrl: string): Promise<string> {
  const res = await fetch(baseUrl + 'plans/' + id + '.bin');
  if (!res.ok) throw new Error('План по ссылке не найден. Возможно, ссылка устарела — запросите новую у консультанта.');
  const buf = new Uint8Array(await res.arrayBuffer());
  const iv = buf.slice(0, 12);
  const data = buf.slice(12);
  const k = await crypto.subtle.importKey('raw', b64urlToBytes(key) as BufferSource, 'AES-GCM', false, ['decrypt']);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, k, data as BufferSource);
    return new TextDecoder().decode(plain);
  } catch {
    throw new Error('Не удалось открыть план — ссылка повреждена или неполная.');
  }
}

// Один и тот же id не должен спрашивать клиента при каждом открытии приложения.
const APPLIED_KEY = 'kd_applied_links';
export function wasApplied(id: string): boolean {
  try { return (JSON.parse(localStorage.getItem(APPLIED_KEY) ?? '[]') as string[]).includes(id); }
  catch { return false; }
}
export function markApplied(id: string) {
  try {
    const list = JSON.parse(localStorage.getItem(APPLIED_KEY) ?? '[]') as string[];
    list.push(id);
    localStorage.setItem(APPLIED_KEY, JSON.stringify(list.slice(-50)));
  } catch {}
}
