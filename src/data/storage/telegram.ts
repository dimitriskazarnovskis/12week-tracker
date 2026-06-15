import type { StorageAdapter } from './adapter';
import type { AppData, Progress } from '../types';
import { emptyProgress, WEEKS } from '../types';

function cs(): any { return (globalThis as any)?.Telegram?.WebApp?.CloudStorage ?? null; }
// Wrap each CloudStorage call so a thrown error OR a callback that never fires
// (old/unsupported clients) resolves to a fallback instead of hanging forever.
function guarded<T>(fallback: T, run: (resolve: (v: T) => void) => void): Promise<T> {
  return new Promise<T>(res => {
    let done = false;
    const finish = (v: T) => { if (!done) { done = true; res(v); } };
    const timer = setTimeout(() => finish(fallback), 3000);
    try { run(v => { clearTimeout(timer); finish(v); }); }
    catch { clearTimeout(timer); finish(fallback); }
  });
}
const get = (k: string) => guarded('', res => cs().getItem(k, (_e: any, v: string) => res(v ?? '')));
const set = (k: string, v: string) => guarded<void>(undefined, res => cs().setItem(k, v, () => res(undefined)));
const keys = () => guarded<string[]>([], res => cs().getKeys((_e: any, k: string[]) => res(k ?? [])));
const del = (ks: string[]) => ks.length ? guarded<void>(undefined, res => cs().removeItems(ks, () => res(undefined))) : Promise.resolve();

const monthOf = (iso: string) => iso.slice(0, 7);
function safeParse<T>(raw: string, fallback: T): T { try { return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; } }
const isDataShard = (k: string) => k === 'kd_plan' || k.startsWith('kd_cal_') || /^kd_prog_w\d+$/.test(k);

export class TelegramCloudAdapter implements StorageAdapter {
  async load(): Promise<unknown | null> {
    if (!cs()) return null;
    const metaRaw = await get('kd_meta'); if (!metaRaw) return null;
    const meta = safeParse<any>(metaRaw, null); if (!meta) return null;
    const settings = safeParse<any>(await get('kd_settings'), { theme: 'auto', lang: 'ru' });
    const allKeys = await keys();
    const planRaw = await get('kd_plan');
    const plan = planRaw ? safeParse<any>(planRaw, null) : null;
    if (plan) {
      const cal: any[] = [];
      for (const k of allKeys.filter(k => k.startsWith('kd_cal_')).sort()) cal.push(...safeParse<any[]>(await get(k), []));
      plan.calendar = cal;
    }
    const progress: Progress = emptyProgress();
    for (let w = 1; w <= WEEKS; w++) {
      const raw = await get(`kd_prog_w${w}`); if (!raw) continue;
      const wk = safeParse<any>(raw, null); if (!wk) continue;
      for (const t of wk.tasks ?? []) progress.checks[`${w}:${t}`] = true;
      for (const [g, v] of Object.entries(wk.kpis ?? {})) progress.kpis[`${w}:${g}`] = v as number;
      if (wk.reflection) progress.reflections[`${w}`] = wk.reflection;
    }
    return { meta, plan, progress, settings };
  }

  async save(data: AppData): Promise<void> {
    if (!cs()) return;
    const before = await keys();
    const written = new Set<string>();
    const put = async (k: string, v: string) => { await set(k, v); written.add(k); };

    await put('kd_settings', JSON.stringify(data.settings));

    if (data.plan) {
      const { calendar, ...core } = data.plan;
      await put('kd_plan', JSON.stringify(core));
      const byMonth: Record<string, any[]> = {};
      for (const e of calendar) (byMonth[monthOf(e.date)] ??= []).push(e);
      for (const [m, list] of Object.entries(byMonth)) {
        let chunk: any[] = [], idx = 0;
        const flush = async () => { await put(`kd_cal_${m}_${idx}`, JSON.stringify(chunk)); idx++; chunk = []; };
        for (const entry of list) {
          if (chunk.length > 0 && JSON.stringify([...chunk, entry]).length > 4000) await flush();
          chunk.push(entry);
        }
        if (chunk.length) await flush();
      }
    }

    for (let w = 1; w <= WEEKS; w++) {
      const tasks = Object.keys(data.progress.checks).filter(k => k.startsWith(`${w}:`) && data.progress.checks[k]).map(k => k.split(':')[1]);
      const kpis = Object.fromEntries(Object.entries(data.progress.kpis).filter(([k]) => k.startsWith(`${w}:`)).map(([k, v]) => [k.split(':')[1], v]));
      const reflection = data.progress.reflections[`${w}`];
      const shard: any = {};
      if (tasks.length) shard.tasks = tasks;
      if (Object.keys(kpis).length) shard.kpis = kpis;
      if (reflection) shard.reflection = reflection;
      if (Object.keys(shard).length) await put(`kd_prog_w${w}`, JSON.stringify(shard));
    }

    const stale = before.filter(k => isDataShard(k) && !written.has(k));
    await del(stale);

    // commit marker LAST: an interrupted save leaves the old kd_meta, so partial data never looks "newest"
    await put('kd_meta', JSON.stringify(data.meta));
  }
}
