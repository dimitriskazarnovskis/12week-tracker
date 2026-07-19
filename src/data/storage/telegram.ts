import type { StorageAdapter } from './adapter';
import type { AppData, Progress } from '../types';
import { emptyProgress, WEEKS } from '../types';

function cs(): any { return (globalThis as any)?.Telegram?.WebApp?.CloudStorage ?? null; }
// CloudStorage limit: 4096 chars per value. Enforced before any write in save().
const MAX_VALUE = 4096;
// Wrap each CloudStorage call. Errors and never-firing callbacks (old clients,
// dead network) REJECT — callers must be able to tell "cloud failed" from "cloud empty",
// otherwise a flaky read looks like a fresh account and triggers re-setup over live data.
function guarded<T>(run: (resolve: (v: T) => void, reject: (e: unknown) => void) => void): Promise<T> {
  return new Promise<T>((res, rej) => {
    let done = false;
    const ok = (v: T) => { if (!done) { done = true; clearTimeout(timer); res(v); } };
    const fail = (e: unknown) => { if (!done) { done = true; clearTimeout(timer); rej(e instanceof Error ? e : new Error(String(e))); } };
    const timer = setTimeout(() => fail(new Error('cloud-timeout')), 3000);
    try { run(ok, fail); } catch (e) { fail(e); }
  });
}
const get = (k: string) => guarded<string>((res, rej) => cs().getItem(k, (e: any, v: string) => e ? rej(e) : res(v ?? '')));
const set = (k: string, v: string) => guarded<void>((res, rej) => cs().setItem(k, v, (e: any) => e ? rej(e) : res(undefined)));
const keys = () => guarded<string[]>((res, rej) => cs().getKeys((e: any, k: string[]) => e ? rej(e) : res(k ?? [])));
const del = (ks: string[]) => ks.length ? guarded<void>((res, rej) => cs().removeItems(ks, (e: any) => e ? rej(e) : res(undefined))) : Promise.resolve();

const monthOf = (iso: string) => iso.slice(0, 7);
function safeParse<T>(raw: string, fallback: T): T { try { return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; } }
const isDataShard = (k: string) => k === 'kd_plan' || k === 'kd_monthly' || k.startsWith('kd_cal_') || /^kd_prog_w\d+$/.test(k);

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
    progress.monthly = safeParse<any>(await get('kd_monthly'), {});
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
    // Build every key/value pair up-front: if anything is oversized, fail BEFORE the first write
    // so the cloud never holds a partial state (kd_meta would still claim the old, consistent one).
    const pairs: Array<[string, string]> = [['kd_settings', JSON.stringify(data.settings)]];

    if (data.plan) {
      const { calendar, ...core } = data.plan;
      pairs.push(['kd_plan', JSON.stringify(core)]);
      const byMonth: Record<string, any[]> = {};
      for (const e of calendar) (byMonth[monthOf(e.date)] ??= []).push(e);
      for (const [m, list] of Object.entries(byMonth)) {
        let chunk: any[] = [], idx = 0;
        const flush = () => { pairs.push([`kd_cal_${m}_${idx}`, JSON.stringify(chunk)]); idx++; chunk = []; };
        for (const entry of list) {
          if (chunk.length > 0 && JSON.stringify([...chunk, entry]).length > 4000) flush();
          chunk.push(entry);
        }
        if (chunk.length) flush();
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
      if (Object.keys(shard).length) pairs.push([`kd_prog_w${w}`, JSON.stringify(shard)]);
    }
    if (data.progress.monthly && Object.keys(data.progress.monthly).length) {
      pairs.push(['kd_monthly', JSON.stringify(data.progress.monthly)]);
    }

    const oversized = pairs.find(([, v]) => v.length > MAX_VALUE);
    if (oversized) throw new Error(`cloud-value-too-large:${oversized[0]}`);

    // Stale-write guard: another device may have saved a newer snapshot since we loaded.
    const remoteMeta = safeParse<any>(await get('kd_meta'), null);
    if (remoteMeta?.updatedAt && remoteMeta.updatedAt > data.meta.updatedAt) return;

    const before = await keys();
    const written = new Set<string>();
    for (const [k, v] of pairs) { await set(k, v); written.add(k); }

    const stale = before.filter(k => isDataShard(k) && !written.has(k));
    await del(stale);

    // commit marker LAST: an interrupted save leaves the old kd_meta, so partial data never looks "newest"
    await set('kd_meta', JSON.stringify(data.meta));
  }
}
