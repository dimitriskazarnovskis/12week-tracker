<script lang="ts">
  import type { Store } from '../data/store.svelte';
  import type { ThemePref } from '../data/types';
  import { toExport, fromImport } from '../data/exportImport';
  let { store, syncTheme }: { store: Store; syncTheme: () => void } = $props();
  const d = $derived(store.data);
  const themes: { id: ThemePref; label: string }[] = [
    { id: 'auto', label: 'Авто' }, { id: 'light', label: 'Светлая' }, { id: 'dark', label: 'Тёмная' },
  ];
  function setTheme(t: ThemePref) { store.setTheme(t); syncTheme(); }
  function doExport() {
    const blob = new Blob([toExport(d, '1.0.0')], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kazarnovskis-dashboard.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function doImport(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try { await store.importData(fromImport(await f.text())); syncTheme(); alert('Загружено'); }
    catch (e) { alert(String((e as Error).message)); }
  }
  function reset() { if (confirm('Сбросить все данные?')) { store.reset(); syncTheme(); } }
</script>
<main class="bd">
  <h1 class="h">Профиль</h1>

  <div class="card">
    <div class="cl">Тема</div>
    <div class="seg">
      {#each themes as t}
        <button class:act={d.settings.theme === t.id} onclick={() => setTheme(t.id)}>{t.label}</button>
      {/each}
    </div>
  </div>

  <div class="card">
    <div class="cl">Цели</div>
    {#each d.plan?.goals ?? [] as g}
      <div class="goal"><span>{g.emoji}</span><b>{g.name}</b></div>
    {/each}
  </div>

  <div class="card">
    <div class="cl">Данные</div>
    <button class="btn" onclick={doExport}>Выгрузить в файл</button>
    <label class="btn out">Загрузить из файла<input type="file" accept="application/json" hidden onchange={doImport} /></label>
    <button class="btn danger" onclick={reset}>Сбросить всё</button>
  </div>

  <div class="foot">Dr. Kazarnovskis &amp; Partners</div>
</main>
<style>
  .bd{padding:14px 16px 24px;display:flex;flex-direction:column;gap:12px}
  .h{font-size:24px;font-weight:800;letter-spacing:-.5px}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px}
  .cl{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--body)}
  .seg{display:flex;gap:6px}
  .seg button{flex:1;padding:9px;border:1px solid var(--line);background:var(--bg);border-radius:9px;font:700 11px Montserrat,sans-serif;cursor:pointer;color:var(--body)}
  .seg button.act{background:var(--red);color:#fff;border-color:var(--red)}
  .goal{display:flex;align-items:center;gap:8px;font-size:13px}
  .btn{padding:11px;border-radius:10px;border:none;background:var(--red);color:#fff;font:800 12px Montserrat,sans-serif;cursor:pointer;text-align:center}
  .btn.out{background:transparent;border:2px solid var(--line);color:var(--ink)}
  .btn.danger{background:transparent;color:var(--muted);border:none;font-weight:600}
  .foot{text-align:center;color:var(--muted);font-size:10px;margin-top:8px}
</style>
