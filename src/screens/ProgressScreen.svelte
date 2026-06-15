<script lang="ts">
  import type { Store } from '../data/store.svelte';
  import { overallStats, currentWeek, weekScore } from '../data/selectors';
  import { WEEKS } from '../data/types';
  import TrendChart from '../components/TrendChart.svelte';
  let { store }: { store: Store } = $props();
  const d = $derived(store.data);
  const st = $derived(overallStats(d));
  const cur = $derived(currentWeek(d.plan!.startDate, new Date()));
</script>
<main class="bd">
  <h1 class="h">Прогресс</h1>
  <div class="stats">
    <div class="sc"><b>{st.weeksActive}/{WEEKS}</b><span>недель</span></div>
    <div class="sc"><b>{st.avgScore}%</b><span>средний</span></div>
    <div class="sc"><b>{st.excellentWeeks}</b><span>85%+</span></div>
  </div>
  <div class="card">
    <div class="cl">Скоринг по неделям</div>
    <TrendChart values={Array.from({ length: WEEKS }, (_, i) => weekScore(d, i + 1))} current={cur} />
  </div>
  {#each d.plan!.goals as g}
    <div class="card">
      <div class="cl">{g.emoji} {g.metricName} · цель {g.metricTarget}</div>
      <TrendChart values={Array.from({ length: WEEKS }, (_, i) => d.progress.kpis[`${i + 1}:${g.id}`] ?? 0)} target={g.metricTarget} current={cur} />
    </div>
  {/each}
</main>
<style>
  .bd{padding:14px 16px 24px;display:flex;flex-direction:column;gap:12px}
  .h{font-size:24px;font-weight:800;letter-spacing:-.5px}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .sc{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 6px;text-align:center}
  .sc b{font-size:22px;font-weight:900;display:block}.sc span{font-size:9px;color:var(--muted);text-transform:uppercase}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px}
  .cl{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;color:var(--body)}
</style>
