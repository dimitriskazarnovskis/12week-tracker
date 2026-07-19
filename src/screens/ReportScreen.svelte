<script lang="ts">
  import type { Store } from '../data/store.svelte';
  import type { MonthlyReport } from '../data/types';
  import { reportMonths, monthLabel, growthHealth } from '../data/selectors';
  import { resolveTheme, sys } from '../theme/theme.svelte';
  import AppHeader from '../components/AppHeader.svelte';

  let { store }: { store: Store } = $props();
  const d = $derived(store.data);
  const scheme = $derived(resolveTheme(d.settings.theme, sys.scheme) as 'light' | 'dark');
  function toggleTheme() { store.setTheme(scheme === 'dark' ? 'light' : 'dark'); }

  const months = $derived(reportMonths(d.plan!.startDate, new Date()));
  // svelte-ignore state_referenced_locally -- стартуем на последнем месяце программы
  let month = $state(reportMonths(store.data.plan!.startDate, new Date()).at(-1)!);
  const rep = $derived((d.progress.monthly ?? {})[month] ?? {});
  // «Было» = ближайший предыдущий месяц, где есть данные (для первого месяца — точка А)
  const prev = $derived.by((): MonthlyReport | undefined => {
    const list = months;
    for (let i = list.indexOf(month) - 1; i >= 0; i--) {
      const r = (d.progress.monthly ?? {})[list[i]];
      if (r && Object.values(r).some(v => v != null)) return r;
    }
    return undefined;
  });
  const health = $derived(growthHealth(rep, prev));

  const METRICS: { k: keyof MonthlyReport; label: string }[] = [
    { k: 'followers', label: 'Подписчики' }, { k: 'views', label: 'Просмотры' }, { k: 'reach', label: 'Охват' },
    { k: 'likes', label: 'Лайки' }, { k: 'comments', label: 'Комментарии' }, { k: 'saves', label: 'Сохранения + пересылки' },
  ];
  const FUNNEL: { k: keyof MonthlyReport; label: string }[] = [
    { k: 'reach', label: 'Охват' }, { k: 'profileVisits', label: 'Заходы в профиль' },
    { k: 'inquiries', label: 'Обращения' }, { k: 'consults', label: 'Консультации' }, { k: 'clients', label: 'Новые клиенты' },
  ];

  const interactions = $derived((rep.likes ?? 0) + (rep.comments ?? 0) + (rep.saves ?? 0));
  const fmt = (n: number) => n.toLocaleString('ru-RU');

  function delta(k: keyof MonthlyReport): { text: string; dir: 'up' | 'down' | 'flat' } | null {
    const cur = rep[k], was = prev?.[k];
    if (cur == null || was == null || month === 'start') return null;
    if (was === 0) return cur > 0 ? { text: 'новое', dir: 'up' } : null;
    const diff = cur - was;
    if (diff === 0) return { text: '=', dir: 'flat' };
    if (diff > 0 && diff / was >= 1) return { text: '×' + (cur / was).toFixed(1).replace('.', ','), dir: 'up' };
    return { text: (diff > 0 ? '+' : '−') + Math.round(Math.abs(diff) / was * 100) + '%', dir: diff > 0 ? 'up' : 'down' };
  }
  function convBadge(i: number): string | null {
    if (i === 0) return null;
    const cur = rep[FUNNEL[i].k], base = rep[FUNNEL[i - 1].k];
    if (cur == null || base == null || base === 0) return null;
    return Math.round(cur / base * 100) + '%';
  }
  function onNum(k: keyof MonthlyReport) {
    return (e: Event) => {
      const raw = (e.target as HTMLInputElement).value;
      const n = raw === '' ? undefined : Math.max(0, Number(raw));
      if (raw === '' || Number.isFinite(n)) store.setMonthly(month, { [k]: n } as Partial<MonthlyReport>);
    };
  }
  const zone = $derived(health == null ? null : health < 40 ? 'bad' : health < 70 ? 'mid' : 'good');
  const zoneLabel = $derived(zone === 'bad' ? 'нездоровый рост' : zone === 'mid' ? 'рост с оговорками' : 'здоровый рост');
</script>
<AppHeader {scheme} onToggle={toggleTheme} />
<main class="bd">
  <h1 class="h">Отчёт месяца</h1>
  <p class="lead">Цифры из Instagram Insights — раз в месяц, обычно на созвоне с консультантом.</p>

  <div class="chips">
    {#each months as m (m)}
      <button class="chip" class:act={m === month} onclick={() => (month = m)}>{monthLabel(m)}</button>
    {/each}
  </div>

  {#if month !== 'start' && prev}
    <div class="sec">Было → стало</div>
    <div class="tiles">
      {#each METRICS as f (f.k)}
        {@const dl = delta(f.k)}
        <div class="tile">
          <div class="tl">{f.label}</div>
          <div class="tv">
            <span class="was">{prev[f.k] != null ? fmt(prev[f.k]!) : '—'}</span>
            <span class="arr">→</span>
            <b class="now" class:down={dl?.dir === 'down'}>{rep[f.k] != null ? fmt(rep[f.k]!) : '—'}</b>
          </div>
          {#if dl}<span class="badge" class:up={dl.dir === 'up'} class:dn={dl.dir === 'down'}>{dl.text}</span>{/if}
        </div>
      {/each}
    </div>
    <div class="inter">Взаимодействия (лайки + комментарии + сохранения): <b>{fmt(interactions)}</b></div>
  {/if}

  {#if health != null}
    <div class="card">
      <div class="cl">Здоровье роста</div>
      <div class="hrow2">
        <b class="hnum {zone}">{health}</b>
        <div class="hbar"><i style="width:{health}%" class={zone ?? ''}></i></div>
      </div>
      <div class="hlab {zone}">{zoneLabel}</div>
    </div>
  {/if}

  <div class="card">
    <div class="cl">Цифры месяца — {monthLabel(month)}</div>
    {#each METRICS as f (f.k)}
      <div class="frow">
        <label class="lb" for="rep-{f.k}">{f.label}</label>
        <input id="rep-{f.k}" class="f" type="number" inputmode="numeric" min="0" placeholder="—"
          value={rep[f.k] ?? ''} oninput={onNum(f.k)} />
      </div>
    {/each}
  </div>

  <div class="card">
    <div class="cl">Воронка месяца</div>
    {#each FUNNEL as f, i (f.k)}
      {#if i > 0}
        <div class="frow">
          <label class="lb" for="fun-{f.k}">{f.label}</label>
          <input id="fun-{f.k}" class="f" type="number" inputmode="numeric" min="0" placeholder="—"
            value={rep[f.k] ?? ''} oninput={onNum(f.k)} />
          {#if convBadge(i)}<span class="conv">{convBadge(i)}</span>{/if}
        </div>
      {/if}
    {/each}
    <div class="hint">Проценты — конверсия из предыдущей ступени. Охват берётся из «Цифр месяца».</div>
  </div>
</main>
<style>
  .bd{padding:3px 16px 24px;display:flex;flex-direction:column;gap:12px}
  .h{font-size:24px;font-weight:800;letter-spacing:-.5px}
  .lead{font-size:13px;color:var(--body);margin-top:-6px;line-height:1.45}
  .chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}
  .chip{flex-shrink:0;padding:10px 13px;border-radius:20px;border:1px solid var(--line);background:var(--surface);
    font:700 12px Montserrat,sans-serif;color:var(--body);cursor:pointer;min-height:40px}
  .chip.act{background:var(--ink);color:var(--bg);border-color:var(--ink)}
  .sec{font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted)}
  .tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .tile{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 11px;position:relative}
  .tl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--muted)}
  .tv{margin-top:4px;font-size:14px;display:flex;align-items:baseline;gap:5px;flex-wrap:wrap}
  .was{color:var(--muted);font-weight:600}
  .arr{color:var(--muted);font-size:11px}
  .now{color:#2E8B57;font-weight:800;font-size:16px}
  .now.down{color:var(--red)}
  .badge{position:absolute;top:8px;right:9px;font-size:10px;font-weight:800;padding:2px 7px;border-radius:12px;background:var(--ring-track);color:var(--body)}
  .badge.up{background:rgba(46,139,87,.15);color:#2E8B57}
  .badge.dn{background:rgba(209,35,41,.12);color:var(--red)}
  .inter{font-size:13px;font-weight:600;color:var(--body);padding:10px 12px;border-radius:11px;background:var(--red-soft)}
  .inter b{color:var(--ink)}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:13px;display:flex;flex-direction:column;gap:8px}
  .cl{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--body)}
  .frow{display:flex;align-items:center;gap:8px}
  .lb{flex:1;font-size:13px;font-weight:600;color:var(--body);min-width:0}
  .f{width:120px;padding:10px 12px;border:1px solid var(--line);background:var(--bg);border-radius:10px;
    font:700 16px Montserrat,sans-serif;color:var(--ink);outline:none;text-align:right;flex-shrink:0}
  .f:focus{border-color:var(--red)}
  .conv{font-size:11px;font-weight:800;color:#2E8B57;background:rgba(46,139,87,.12);padding:4px 8px;border-radius:12px;flex-shrink:0}
  .hint{font-size:11.5px;color:var(--muted);line-height:1.45}
  .hrow2{display:flex;align-items:center;gap:12px}
  .hnum{font-size:30px;font-weight:900}
  .hnum.bad{color:var(--red)} .hnum.mid{color:#C8860B} .hnum.good{color:#2E8B57}
  .hbar{flex:1;height:8px;border-radius:4px;background:var(--ring-track);overflow:hidden}
  .hbar i{display:block;height:100%;border-radius:4px;transition:width .4s ease}
  .hbar i.bad{background:var(--red)} .hbar i.mid{background:#C8860B} .hbar i.good{background:#2E8B57}
  .hlab{font-size:12px;font-weight:700}
  .hlab.bad{color:var(--red)} .hlab.mid{color:#C8860B} .hlab.good{color:#2E8B57}
</style>
