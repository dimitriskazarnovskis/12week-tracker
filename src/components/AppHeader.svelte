<script lang="ts">
  import logoForLight from '../assets/logo-dual.png';      // dark gears, on light bg
  import logoForDark from '../assets/logo-dual-dark.png';  // light/white gears, on dark bg
  let { scheme, onToggle }: { scheme: 'light' | 'dark'; onToggle: () => void } = $props();
</script>
<header class="hd">
  <div class="brand">
    <img src={scheme === 'dark' ? logoForDark : logoForLight} alt="Dr. Kazarnovskis & Partners" />
    <b>Dr. Kazarnovskis <span>&amp;</span> Partners</b>
  </div>
  <button class="tg" onclick={onToggle} aria-label="Сменить тему">{scheme === 'dark' ? '☀️' : '🌙'}</button>
</header>
<style>
  .hd{display:flex;align-items:center;justify-content:space-between;padding:calc(15px + env(safe-area-inset-top)) 16px 9px}
  .brand{display:flex;align-items:center;gap:7px}
  .brand img{height:19px;width:auto;display:block}
  .brand b{font-size:10.5px;font-weight:700;color:var(--ink)}
  .brand b span{color:var(--red)}
  .tg{width:29px;height:29px;border-radius:9px;background:var(--surface);border:1px solid var(--line);font-size:13px;cursor:pointer}
</style>
