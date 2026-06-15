<script lang="ts">
  import { kpiProgress } from '../data/selectors';
  let { label, value, target, unit = '' }: { label: string; value: number; target: number; unit?: string } = $props();
  const pct = $derived(kpiProgress(value, target));
</script>
<div class="kpi">
  <div class="t">{label}</div>
  <div class="v">{value}<small>{unit}</small></div>
  <div class="pbar"><i style="width:{pct}%"></i></div>
  <div class="goal">цель {target}{unit}</div>
</div>
<style>
  .kpi{flex:1;border-radius:13px;padding:10px 11px;background:var(--surface);border:1px solid var(--line)}
  .t{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)}
  .v{font-size:18px;font-weight:800;line-height:1.1;margin-top:2px}
  .v small{font-size:9px;opacity:.5;font-weight:700}
  .pbar{height:5px;border-radius:3px;margin-top:8px;overflow:hidden;background:var(--ring-track)}
  .pbar i{display:block;height:100%;border-radius:3px;background:var(--red);transition:width .4s ease}
  .goal{font-size:7.5px;font-weight:700;color:var(--muted);margin-top:5px;text-transform:uppercase;letter-spacing:.3px}
</style>
