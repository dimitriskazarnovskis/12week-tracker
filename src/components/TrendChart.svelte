<script lang="ts">
  import { WEEKS } from '../data/types';
  let { values, target = 0, current }: { values: number[]; target?: number; current: number } = $props();
  const max = $derived(Math.max(target, 1, ...values));
</script>
<div class="chart">
  {#each Array(WEEKS) as _, i}
    {@const v = values[i] ?? 0}
    <div class="col">
      <div class="bar" class:cur={i + 1 === current} style="height:{Math.max(3, (v / max) * 46)}px"></div>
      <span>{i + 1}</span>
    </div>
  {/each}
</div>
<style>
  .chart{display:flex;gap:3px;align-items:flex-end;height:64px}
  .col{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px}
  .bar{width:100%;border-radius:2px;background:var(--ring-track);transition:height .4s ease}
  .bar.cur{background:var(--red)}
  .col span{font-size:8px;color:var(--muted);font-weight:700}
</style>
