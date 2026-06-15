<script lang="ts">
  import type { Store } from '../data/store.svelte';
  import { tg } from '../lib/telegram';
  import { resolveTheme } from '../theme/theme.svelte';
  import { weekScore, currentWeek, tacticsForGoal } from '../data/selectors';
  import { WEEKS } from '../data/types';
  import AppHeader from '../components/AppHeader.svelte';
  import WeekStrip from '../components/WeekStrip.svelte';
  import ScoreRing from '../components/ScoreRing.svelte';
  import KpiTile from '../components/KpiTile.svelte';
  import TaskRow from '../components/TaskRow.svelte';
  import Confetti from '../components/Confetti.svelte';

  let { store }: { store: Store } = $props();
  const d = $derived(store.data);
  let week = $state(currentWeek(store.data.plan!.startDate, new Date()));
  const scores = $derived(Array.from({ length: WEEKS }, (_, i) => weekScore(d, i + 1)));
  const score = $derived(weekScore(d, week));
  const block = $derived(week <= 4 ? 'Блок 1 · Привычка' : week <= 8 ? 'Блок 2 · Ускорение' : 'Блок 3 · Финиш');
  const scheme = $derived(resolveTheme(d.settings.theme, tg().colorScheme()) as 'light' | 'dark');
  const hasTactics = $derived((d.plan?.tactics?.length ?? 0) > 0);
  const today = $derived(currentWeek(d.plan!.startDate, new Date()));

  const celebrated = new Set<number>();
  let showConfetti = $state(false);
  $effect(() => {
    if (score >= 85 && !celebrated.has(week)) {
      celebrated.add(week);
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      if (!reduced) {
        tg().haptic('success');
        showConfetti = true;
        setTimeout(() => (showConfetti = false), 1800);
      }
    }
  });

  function toggle(taskId: string) { tg().haptic('light'); store.toggleTask(week, taskId); }
  function toggleTheme() { store.setTheme(scheme === 'dark' ? 'light' : 'dark'); }
  function onReflect(e: Event) { store.setReflection(week, (e.target as HTMLTextAreaElement).value); }
</script>

{#if showConfetti}<Confetti />{/if}
<AppHeader {scheme} onToggle={toggleTheme} />
<WeekStrip current={week} {scores} onPick={(w) => (week = w)} />
<main class="bd">
  <div><div class="eyebrow">{block}</div><h1 class="wk">Неделя {week}</h1></div>

  <div class="herorow">
    <ScoreRing value={score} />
    <div class="kpis">
      {#each d.plan!.goals.slice(0, 2) as g}
        <KpiTile label={g.metricName} value={d.progress.kpis[`${week}:${g.id}`] ?? 0} target={g.metricTarget} />
      {/each}
    </div>
  </div>

  <div class="sec">Задачи недели</div>
  {#if hasTactics}
    {#each d.plan!.goals as g}
      {#each tacticsForGoal(d, g.id) as t}
        <TaskRow text={t.text} done={!!d.progress.checks[`${week}:${t.id}`]} onToggle={() => toggle(t.id)} />
      {/each}
    {/each}
  {:else}
    <div class="empty">Задачи на неделю появятся, когда мы настроим план.</div>
  {/if}

  {#if week <= today}
    <div class="sec">Итог недели</div>
    <textarea class="reflect" placeholder="Что зашло, что меняем на следующей неделе?"
      value={d.progress.reflections[`${week}`] ?? ''} onchange={onReflect}></textarea>
  {/if}
</main>

<style>
  .bd{padding:3px 16px 14px;display:flex;flex-direction:column;gap:12px}
  .eyebrow{font-size:8.5px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:var(--red)}
  .wk{font-size:29px;font-weight:800;letter-spacing:-.5px;line-height:1;margin-top:2px}
  .herorow{display:flex;align-items:center;gap:13px}
  .kpis{display:flex;gap:8px;flex:1}
  .sec{font-size:9px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:var(--muted);margin-top:2px}
  .empty{padding:18px;text-align:center;color:var(--muted);font-size:12px;background:var(--surface);border:1px solid var(--line);border-radius:12px}
  .reflect{width:100%;min-height:64px;resize:none;border-radius:12px;border:1px solid var(--line);background:var(--surface);
    color:var(--ink);font:500 12px Montserrat,sans-serif;padding:11px 13px;line-height:1.5;outline:none}
  .reflect:focus{border-color:var(--red)}
</style>
