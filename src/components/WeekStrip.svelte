<script lang="ts">
  import { WEEKS } from '../data/types';
  let { current, scores, onPick }: { current: number; scores: number[]; onPick: (w: number) => void } = $props();
</script>
<div class="strip">
  {#each Array(WEEKS) as _, i}
    {@const w = i + 1}
    <button class="seg" onclick={() => onPick(w)} aria-label={'Неделя ' + w} aria-current={w === current}>
      <span class="bar" class:now={w === current} class:done={scores[i] >= 50 && w !== current}></span>
    </button>
  {/each}
</div>
<style>
  .strip{display:flex;gap:3px;padding:2px 16px 9px}
  .seg{flex:1;height:26px;display:flex;align-items:center;background:none;border:none;padding:0;cursor:pointer}
  .bar{width:100%;height:5px;border-radius:3px;background:var(--line);transition:background .2s}
  .bar.done{background:var(--red)}
  .bar.now{background:var(--ink)}
</style>
