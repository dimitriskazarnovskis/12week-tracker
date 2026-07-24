<script lang="ts">
  import type { Store } from '../data/store.svelte';
  import { overallStats, currentWeek, weekScore, programState, lastKpi, kpiProgress, programEndISO, formatDay, nextMondayISO } from '../data/selectors';
  import { dialogs } from '../lib/telegram';
  import { WEEKS } from '../data/types';
  import { resolveTheme, sys } from '../theme/theme.svelte';
  import AppHeader from '../components/AppHeader.svelte';
  import TrendChart from '../components/TrendChart.svelte';
  let { store }: { store: Store } = $props();
  const d = $derived(store.data);
  const st = $derived(overallStats(d));
  const cur = $derived(currentWeek(d.plan!.startDate, new Date()));
  const scheme = $derived(resolveTheme(d.settings.theme, sys.scheme) as 'light' | 'dark');
  const done = $derived(programState(d.plan!.startDate, new Date()) === 'done');
  let copied = $state('');
  function toggleTheme() { store.setTheme(scheme === 'dark' ? 'light' : 'dark'); }

  function summaryText(): string {
    const plan = d.plan!;
    const period = `${formatDay(plan.startDate, false)} – ${formatDay(programEndISO(plan.startDate), false)}`;
    const goals = plan.goals.map(g => {
      const v = lastKpi(d, g.id);
      return `${g.emoji} ${g.name}, ${g.metricName}: ${v} из ${g.metricTarget} (${kpiProgress(v, g.metricTarget)}%)`;
    }).join('\n');
    return `🏁 Итоги 12 недель (${period})\nВыполнение: средний балл ${st.avgScore}% · отличных недель (≥85%): ${st.excellentWeeks} из ${WEEKS}\n\nЦели:\n${goals}\n\nDr. Kazarnovskis & Partners`;
  }
  async function copySummary() {
    try { await navigator.clipboard.writeText(summaryText()); copied = 'Скопировано ✓ Вставьте сообщением в чат с вашим консультантом.'; }
    catch { copied = 'Не удалось скопировать. Выделите текст вручную.'; }
  }

  // Новый цикл: прошлый уходит в архив (Профиль), недели начинаются заново.
  let cycleFormOpen = $state(false);
  let cycleDate = $state(nextMondayISO());
  let cycleKeepGoals = $state(true);
  async function startCycle() {
    if (!cycleDate) return;
    if (!(await dialogs.confirm('Начать новый цикл 12 недель? Текущий цикл со всей историей уйдёт в архив (Профиль → «Архив циклов»).'))) return;
    await store.startNewCycle(cycleDate, cycleKeepGoals);
  }
</script>
<AppHeader {scheme} onToggle={toggleTheme} />
<main class="bd">
  <h1 class="h">Прогресс</h1>

  {#if done}
    <div class="card fin">
      <div class="cl">Итоги 12 недель</div>
      <p class="fint">Средний балл <b>{st.avgScore}%</b> · отличных недель (≥85%): <b>{st.excellentWeeks} из {WEEKS}</b>.</p>
      {#each d.plan!.goals as g (g.id)}
        <div class="finrow">{g.emoji} {g.name}, {g.metricName}: <b>{lastKpi(d, g.id)}</b> из {g.metricTarget} ({kpiProgress(lastKpi(d, g.id), g.metricTarget)}%)</div>
      {/each}
      <button class="btn" onclick={copySummary}>Скопировать итоги</button>
      {#if copied}<div class="msg" role="status">{copied}</div>{/if}

      {#if !cycleFormOpen}
        <button class="btn out" onclick={() => (cycleFormOpen = true)}>Начать новый цикл 12 недель</button>
      {:else}
        <div class="cycleform">
          <label class="lb" for="cycle-date">Дата старта нового цикла</label>
          <input id="cycle-date" class="f" type="date" bind:value={cycleDate} />
          <label class="chk"><input type="checkbox" bind:checked={cycleKeepGoals} /> Перенести цели и задачи недели в новый цикл</label>
          <div class="erow">
            <button class="btn out" onclick={() => (cycleFormOpen = false)}>Отмена</button>
            <button class="btn" onclick={startCycle}>Начать</button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
  <div class="stats">
    <div class="sc"><b>{st.weeksActive}/{WEEKS}</b><span>недель в работе</span></div>
    <div class="sc"><b>{st.avgScore}%</b><span>средний балл</span></div>
    <div class="sc"><b>{st.excellentWeeks}</b><span>недель ≥ 85%</span></div>
  </div>
  <div class="card">
    <div class="cl">Выполнение по неделям, %</div>
    <TrendChart values={Array.from({ length: WEEKS }, (_, i) => weekScore(d, i + 1))} current={cur} />
  </div>
  {#each d.plan!.goals as g (g.id)}
    <div class="card">
      <div class="cl">{g.emoji} {g.metricName} · цель {g.metricTarget}</div>
      <TrendChart values={Array.from({ length: WEEKS }, (_, i) => d.progress.kpis[`${i + 1}:${g.id}`] ?? 0)} target={g.metricTarget} current={cur} />
    </div>
  {/each}
</main>
<style>
  .bd{padding:6px 16px 28px;display:flex;flex-direction:column;gap:16px}
  .h{font-size:24px;font-weight:800;letter-spacing:-.5px}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .sc{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px 8px;text-align:center}
  .sc b{font-size:22px;font-weight:900;display:block}.sc span{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.2px}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px}
  .cl{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:13px;color:var(--body);overflow-wrap:anywhere}
  .fin{display:flex;flex-direction:column;gap:10px;border-color:var(--red)}
  .fin .cl{margin-bottom:0}
  .fint{font-size:14px;line-height:1.5;color:var(--body)}
  .fint b{color:var(--ink)}
  .finrow{font-size:13px;line-height:1.5;color:var(--body);overflow-wrap:anywhere}
  .finrow b{color:var(--ink)}
  .btn{margin-top:4px;padding:13px;border-radius:10px;border:none;background:var(--red);color:#fff;font:800 13px Montserrat,sans-serif;cursor:pointer;text-align:center}
  .btn.out{background:transparent;border:2px solid var(--line);color:var(--ink)}
  .msg{font-size:13px;font-weight:600;color:var(--body);line-height:1.45}
  .cycleform{display:flex;flex-direction:column;gap:8px;padding:11px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}
  .lb{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}
  .f{width:100%;padding:12px;border:1px solid var(--line);background:var(--surface);border-radius:10px;font:600 16px Montserrat,sans-serif;color:var(--ink);outline:none}
  .chk{display:flex;gap:8px;align-items:center;font-size:14px;color:var(--body);min-height:40px}
  .chk input{width:20px;height:20px;accent-color:var(--red)}
  .erow{display:flex;gap:8px}
  .erow .btn{flex:1;margin-top:0}
</style>
