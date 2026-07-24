<script lang="ts">
  import { WEEKS } from '../data/types';
  // Светофор Дмитрия: прошедшие недели зелёные, текущая красная, будущие серые.
  // todayWeek: 0 = программа не началась (все серые), WEEKS+1 = завершена (все зелёные).
  let { current, todayWeek = 0, onPick }:
    { current: number; todayWeek?: number; onPick: (w: number) => void } = $props();
</script>
<div class="strip">
  {#each Array(WEEKS) as _, i}
    {@const w = i + 1}
    <button class="cell" class:past={w < todayWeek} class:now={w === todayWeek} class:sel={w === current}
      onclick={() => onPick(w)} aria-label={'Неделя ' + w} aria-current={w === current}>{w}</button>
  {/each}
</div>
<style>
  .strip{display:grid;grid-template-columns:repeat(6,1fr);gap:7px;padding:4px 16px 8px}
  .cell{height:44px;border-radius:12px;border:none;cursor:pointer;
    font:800 15px Montserrat,sans-serif;background:var(--ring-track);color:var(--muted);transition:background .2s,color .2s}
  .cell.past{background:#2E8B57;color:#fff}
  .cell.now{background:var(--red);color:#fff}
  .cell.sel{outline:3px solid var(--ink);outline-offset:1px}
</style>
