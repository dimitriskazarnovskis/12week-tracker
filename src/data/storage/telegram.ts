import type { StorageAdapter } from './adapter';
import type { AppData, Progress } from '../types';
import { emptyProgress, WEEKS } from '../types';

function cs(): any { return (globalThis as any)?.Telegram?.WebApp?.CloudStorage ?? null; }
const get = (k: string) => new Promise<string>(res => cs().getItem(k, (_e: any, v: string) => res(v ?? '')));
const set = (k: string, v: string) => new Promise<void>(res => cs().setItem(k, v, () => res()));
const keys = () => new Promise<string[]>(res => cs().getKeys((_e: any, k: string[]) => res(k ?? [])));

const monthOf = (iso: string) => iso.slice(0, 7);

export class TelegramCloudAdapter implements StorageAdapter {
  async load(): Promise<unknown | null> {
    if (!cs()) return null;
    const metaRaw = await get('kd_meta'); if (!metaRaw) return null;
    const meta = JSON.parse(metaRaw);
    const settings = JSON.parse((await get('kd_settings')) || '{"theme":"auto","lang":"ru"}');
    const planRaw = await get('kd_plan');
    let plan = planRaw ? JSON.parse(planRaw) : null;
    if (plan) {
      const ks = await keys();
      const cal: any[] = [];
      for (const k of ks.filter(k => k.startsWith('kd_cal_')).sort()) cal.push(...JSON.parse((await get(k)) || '[]'));
      plan.calendar = cal;
    }
    const progress: Progress = emptyProgress();
    for (let w = 1; w <= WEEKS; w++) {
      const raw = await get(`kd_prog_w${w}`); if (!raw) continue;
      const wk = JSON.parse(raw);
      for (const t of wk.tasks ?? []) progress.checks[`${w}:${t}`] = true;
      Object.assign(progress.kpis, Object.fromEntries(Object.entries(wk.kpis ?? {}).map(([g, v]) => [`${w}:${g}`, v])));
      if (wk.reflection) progress.reflections[`${w}`] = wk.reflection;
    }
    return { meta, plan, progress, settings };
  }

  async save(data: AppData): Promise<void> {
    if (!cs()) return;
    await set('kd_meta', JSON.stringify(data.meta));
    await set('kd_settings', JSON.stringify(data.settings));
    if (data.plan) {
      const { calendar, ...core } = data.plan;
      await set('kd_plan', JSON.stringify(core));
      const byMonth: Record<string, any[]> = {};
      for (const e of calendar) (byMonth[monthOf(e.date)] ??= []).push(e);
      for (const [m, list] of Object.entries(byMonth)) {
        // Chunk month entries so no single key exceeds 4096 chars
        let chunk: any[] = [];
        let chunkIdx = 0;
        for (const entry of list) {
          const candidate = JSON.stringify([...chunk, entry]);
          if (chunk.length > 0 && candidate.length > 4000) {
            await set(`kd_cal_${m}_${chunkIdx}`, JSON.stringify(chunk));
            chunkIdx++;
            chunk = [entry];
          } else {
            chunk.push(entry);
          }
        }
        if (chunk.length) {
          const key = chunkIdx === 0 ? `kd_cal_${m}` : `kd_cal_${m}_${chunkIdx}`;
          await set(key, JSON.stringify(chunk));
        }
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
      if (Object.keys(shard).length) await set(`kd_prog_w${w}`, JSON.stringify(shard));
    }
  }
}
