<script lang="ts">
  let { value = 0, size = 72 }: { value?: number; size?: number } = $props();
</script>
<div class="ring" style="--p:{value}%;width:{size}px;height:{size}px">
  <div class="inner"><b>{value}</b><s>%</s></div>
</div>
<style>
  .ring{border-radius:50%;display:flex;align-items:center;justify-content:center;
    background:conic-gradient(var(--red) var(--p), var(--ring-track) 0);transition:background .5s ease}
  .inner{width:76%;height:76%;border-radius:50%;background:var(--bg);
    display:flex;flex-direction:column;align-items:center;justify-content:center}
  .inner b{font-size:20px;font-weight:800;line-height:1}
  .inner s{font-size:8px;text-decoration:none;opacity:.55}
</style>
