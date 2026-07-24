<script lang="ts">
  let { text, done = false, disabled = false, onToggle }: { text: string; done?: boolean; disabled?: boolean; onToggle: () => void } = $props();
</script>
<button class="task" class:dn={done} onclick={onToggle} aria-pressed={done} {disabled}>
  <span class="cb" class:on={done}></span><span class="tx">{text}</span>
</button>
<style>
  .task{display:flex;align-items:center;gap:12px;padding:15px 14px;border-radius:12px;width:100%;text-align:left;
    background:var(--surface);border:1px solid var(--line);color:var(--body);font:600 14px Montserrat,sans-serif;cursor:pointer}
  .task.dn{color:var(--ink)}
  .task:disabled{opacity:.55;cursor:default}
  .cb{width:20px;height:20px;border-radius:6px;flex-shrink:0;border:2px solid var(--muted);display:flex;align-items:center;justify-content:center}
  .cb.on{background:var(--red);border-color:var(--red)}
  .cb.on::after{content:'✓';color:#fff;font-size:12px;font-weight:800}
  .tx{min-width:0;overflow-wrap:anywhere}
</style>
