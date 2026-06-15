<script lang="ts">
  import { WEEKS } from '../data/types';
  let { current, scores, onPick }: { current: number; scores: number[]; onPick: (w: number) => void } = $props();
</script>
<div class="strip">
  {#each Array(WEEKS) as _, i}
    {@const w = i + 1}
    <button class="seg" class:now={w === current} class:done={scores[i] >= 50 && w !== current}
      onclick={() => onPick(w)} aria-label={'Неделя ' + w}></button>
  {/each}
</div>
<style>
  .strip{display:flex;gap:3px;padding:0 16px 11px}
  .seg{flex:1;height:5px;border-radius:3px;border:none;background:var(--line);cursor:pointer;padding:0}
  .seg.done{background:var(--red)} .seg.now{background:var(--ink)}
</style>
