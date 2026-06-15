<script lang="ts">
  let { text, done = false, onToggle }: { text: string; done?: boolean; onToggle: () => void } = $props();
</script>
<button class="task" class:dn={done} onclick={onToggle} aria-pressed={done}>
  <span class="cb" class:on={done}></span><span class="tx">{text}</span>
</button>
<style>
  .task{display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:12px;width:100%;text-align:left;
    background:var(--surface);border:1px solid var(--line);color:var(--body);font:600 12px Montserrat,sans-serif;cursor:pointer}
  .task.dn{color:var(--ink)}
  .cb{width:20px;height:20px;border-radius:6px;flex-shrink:0;border:2px solid var(--muted);display:flex;align-items:center;justify-content:center}
  .cb.on{background:var(--red);border-color:var(--red)}
  .cb.on::after{content:'✓';color:#fff;font-size:12px;font-weight:800}
</style>
