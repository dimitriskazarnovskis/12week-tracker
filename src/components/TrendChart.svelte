<script lang="ts">
  import { WEEKS } from '../data/types';
  let { values, target = 0, current }: { values: number[]; target?: number; current: number } = $props();
  const max = $derived(Math.max(target, 1, ...values));
</script>
<div class="chart">
  {#if target > 0}
    <div class="goal-line" style="bottom:{17 + (target / max) * 46}px" title="Цель: {target}"></div>
  {/if}
  {#each Array(WEEKS) as _, i}
    {@const v = values[i] ?? 0}
    <div class="col">
      <div class="bar" class:cur={i + 1 === current} class:has={v > 0 && i + 1 !== current} style="height:{Math.max(3, (v / max) * 46)}px"></div>
      <span>{i + 1}</span>
    </div>
  {/each}
</div>
<style>
  .chart{display:flex;gap:3px;align-items:flex-end;height:66px;position:relative}
  .goal-line{position:absolute;left:0;right:0;border-top:2px dashed var(--muted);opacity:.55;pointer-events:none}
  .col{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px}
  .bar{width:100%;border-radius:2px;background:var(--ring-track);transition:height .4s ease}
  .bar.has{background:rgba(209,35,41,.45)}
  .bar.cur{background:var(--red)}
  .col span{font-size:10px;color:var(--muted);font-weight:700}
</style>
