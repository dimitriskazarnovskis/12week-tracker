<script lang="ts">
  import { WEEKS } from '../data/types';
  let { current, todayWeek = 0, scores, onPick }:
    { current: number; todayWeek?: number; scores: number[]; onPick: (w: number) => void } = $props();
</script>
<div class="strip">
  {#each Array(WEEKS) as _, i}
    {@const w = i + 1}
    <button class="seg" onclick={() => onPick(w)} aria-label={'Неделя ' + w} aria-current={w === current}>
      <span class="cell" class:sel={w === current} class:full={scores[i] >= 85} class:part={scores[i] > 0 && scores[i] < 85}>{w}</span>
      <span class="dot" class:on={w === todayWeek}></span>
    </button>
  {/each}
</div>
<style>
  .strip{display:flex;gap:3px;padding:2px 16px 4px}
  .seg{flex:1;min-height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
    background:none;border:none;padding:0;cursor:pointer;min-width:0}
  .cell{width:100%;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;
    font:700 10.5px Montserrat,sans-serif;color:var(--muted);background:var(--ring-track);transition:background .2s,color .2s}
  .cell.part{background:rgba(209,35,41,.22);color:var(--ink)}
  .cell.full{background:var(--red);color:#fff}
  .cell.sel{outline:2px solid var(--ink);outline-offset:1px;color:var(--ink)}
  .cell.full.sel{color:#fff}
  .dot{width:4px;height:4px;border-radius:50%;background:transparent}
  .dot.on{background:var(--red)}
</style>
