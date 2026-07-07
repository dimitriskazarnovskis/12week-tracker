<script lang="ts">
  import { kpiProgress } from '../data/selectors';
  let { label, value, target, unit = '', readonly = false, onChange }:
    { label: string; value: number; target: number; unit?: string; readonly?: boolean; onChange?: (v: number) => void } = $props();
  const pct = $derived(kpiProgress(value, target));
  let inputEl = $state<HTMLInputElement | undefined>();
  let focused = false;
  // Uncontrolled while focused: external value changes must not fight the user's typing,
  // but clearing the field really stores 0 (no ghost of the old number on next open).
  $effect(() => { const v = value; if (inputEl && !focused) inputEl.value = String(v); });
  function onInput(e: Event) {
    if (!onChange) return;
    const raw = (e.target as HTMLInputElement).value;
    const n = raw === '' ? 0 : Number(raw);
    if (Number.isFinite(n)) onChange(Math.max(0, n));
  }
</script>
<div class="kpi">
  <div class="t">{label}</div>
  {#if onChange && !readonly}
    <input bind:this={inputEl} class="v inp" type="number" inputmode="numeric" min="0"
      oninput={onInput}
      onfocus={() => { focused = true; }}
      onblur={() => { focused = false; if (inputEl) inputEl.value = String(value); }}
      aria-label={label} />
  {:else}
    <div class="v">{value}<small>{unit}</small></div>
  {/if}
  <div class="pbar"><i style="width:{pct}%"></i></div>
  <div class="goal">цель {target}{unit}</div>
</div>
<style>
  .kpi{flex:1 1 45%;min-width:0;border-radius:13px;padding:10px 11px;background:var(--surface);border:1px solid var(--line)}
  .t{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);overflow-wrap:anywhere}
  .v{font-size:18px;font-weight:800;line-height:1.1;margin-top:2px;color:var(--ink)}
  .v small{font-size:10px;opacity:.6;font-weight:700}
  .inp{width:100%;border:none;background:transparent;outline:none;padding:0;font-family:inherit;appearance:textfield;-moz-appearance:textfield}
  .inp::-webkit-outer-spin-button,.inp::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  .inp:focus{color:var(--red)}
  .pbar{height:5px;border-radius:3px;margin-top:8px;overflow:hidden;background:var(--ring-track)}
  .pbar i{display:block;height:100%;border-radius:3px;background:var(--red);transition:width .4s ease}
  .goal{font-size:10px;font-weight:700;color:var(--muted);margin-top:5px;text-transform:uppercase;letter-spacing:.3px}
</style>
