<script lang="ts">
  import { kpiProgress } from '../data/selectors';
  let { label, value, target, unit = '', onChange }:
    { label: string; value: number; target: number; unit?: string; onChange?: (v: number) => void } = $props();
  const pct = $derived(kpiProgress(value, target));
  function onInput(e: Event) {
    if (!onChange) return;
    const raw = (e.target as HTMLInputElement).value;
    if (raw === '') return; // clearing the field shouldn't instantly save 0
    const n = Number(raw);
    if (Number.isFinite(n)) onChange(Math.max(0, n));
  }
</script>
<div class="kpi">
  <div class="t">{label}</div>
  {#if onChange}
    <input class="v inp" type="number" inputmode="numeric" min="0" value={value} oninput={onInput} aria-label={label} />
  {:else}
    <div class="v">{value}<small>{unit}</small></div>
  {/if}
  <div class="pbar"><i style="width:{pct}%"></i></div>
  <div class="goal">цель {target}{unit}</div>
</div>
<style>
  .kpi{flex:1;min-width:0;border-radius:13px;padding:10px 11px;background:var(--surface);border:1px solid var(--line)}
  .t{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)}
  .v{font-size:18px;font-weight:800;line-height:1.1;margin-top:2px;color:var(--ink)}
  .v small{font-size:9px;opacity:.5;font-weight:700}
  .inp{width:100%;border:none;background:transparent;outline:none;padding:0;font-family:inherit;-moz-appearance:textfield}
  .inp::-webkit-outer-spin-button,.inp::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  .inp:focus{color:var(--red)}
  .pbar{height:5px;border-radius:3px;margin-top:8px;overflow:hidden;background:var(--ring-track)}
  .pbar i{display:block;height:100%;border-radius:3px;background:var(--red);transition:width .4s ease}
  .goal{font-size:7.5px;font-weight:700;color:var(--muted);margin-top:5px;text-transform:uppercase;letter-spacing:.3px}
</style>
