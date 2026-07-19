<script lang="ts">
  import type { Store } from '../data/store.svelte';
  import type { AppData, ThemePref } from '../data/types';
  import { APP_VERSION } from '../data/types';
  import { toExport, parseImportFile } from '../data/exportImport';
  import { tacticsForGoal } from '../data/selectors';
  import { tg, dialogs } from '../lib/telegram';
  import { resolveTheme, sys } from '../theme/theme.svelte';
  import AppHeader from '../components/AppHeader.svelte';

  let { store }: { store: Store } = $props();
  const d = $derived(store.data);
  const scheme = $derived(resolveTheme(d.settings.theme, sys.scheme) as 'light' | 'dark');
  const inTelegram = tg().isTMA();
  const themes: { id: ThemePref; label: string }[] = [
    { id: 'light', label: 'Светлая' }, { id: 'dark', label: 'Тёмная' },
  ];

  let editingId = $state<string | null>(null);
  let dataMsg = $state('');
  let dataMsgBad = $state(false);

  function toggleTheme() { store.setTheme(scheme === 'dark' ? 'light' : 'dark'); }

  async function doExport() {
    const json = toExport($state.snapshot(d) as AppData, APP_VERSION);
    if (inTelegram) {
      // Mini Apps have no download manager — the clipboard is the reliable path.
      try {
        await navigator.clipboard.writeText(json);
        dataMsg = 'Скопировано. Вставьте сообщением в «Избранное» в Telegram — это и будет резервная копия.';
        dataMsgBad = false;
      } catch {
        dataMsg = 'Не удалось скопировать. Откройте дашборд в обычном браузере и выгрузите файл там.';
        dataMsgBad = true;
      }
    } else {
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'kazarnovskis-dashboard.json';
      a.click();
      URL.revokeObjectURL(a.href);
      dataMsg = 'Файл сохранён в загрузки.';
      dataMsgBad = false;
    }
  }
  async function doImport(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    try {
      const parsed = parseImportFile(await f.text());
      if (parsed.kind === 'update') {
        if (await dialogs.confirm('Применить обновление от консультанта? Ваши отметки и записи сохранятся.')) {
          await store.applyUpdate(parsed.update);
          dataMsg = (parsed.update.note ? parsed.update.note + ' — ' : '') + 'Обновление применено ✓';
          dataMsgBad = false;
        }
      } else if (await dialogs.confirm('Заменить все текущие данные данными из файла? Это необратимо.')) {
        await store.importData(parsed.data);
        dataMsg = 'Данные заменены ✓'; dataMsgBad = false;
      }
    } catch (e) { dataMsg = String((e as Error).message); dataMsgBad = true; }
    finally { input.value = ''; }
  }
  async function reset() {
    if (await dialogs.confirm('Сбросить все данные? Это удалит план и весь прогресс.')) store.reset();
  }
  async function delTactic(id: string, text: string) {
    if (await dialogs.confirm(`Удалить задачу «${text || 'без названия'}» и все её отметки?`)) store.removeTactic(id);
  }
</script>
<AppHeader {scheme} onToggle={toggleTheme} />
<main class="bd">
  <h1 class="h">Профиль</h1>

  {#if store.saveError}
    <div class="warn bad">Не удаётся сохранить данные на устройстве. Освободите место или проверьте настройки браузера.</div>
  {:else if inTelegram && !store.cloudOk}
    <div class="warn">Облачная копия Telegram сейчас недоступна — данные сохраняются только на этом устройстве.</div>
  {/if}

  <div class="card">
    <div class="cl">Тема</div>
    <div class="seg">
      {#each themes as t}
        <!-- легаси-«авто» из старых данных подсвечивает «Светлая» -->
        <button class:act={(d.settings.theme === 'dark') === (t.id === 'dark')} onclick={() => store.setTheme(t.id)}>{t.label}</button>
      {/each}
    </div>
  </div>

  <div class="card">
    <div class="cl">Цели и задачи</div>
    {#each d.plan?.goals ?? [] as g (g.id)}
      {#if editingId === g.id}
        <div class="editor">
          <label class="lb" for="ename-{g.id}">Название цели</label>
          <input id="ename-{g.id}" class="f" value={g.name} oninput={(e) => store.updateGoal(g.id, { name: (e.target as HTMLInputElement).value })} />
          <div class="row2">
            <div class="col">
              <label class="lb" for="emetric-{g.id}">Показатель</label>
              <input id="emetric-{g.id}" class="f" value={g.metricName} oninput={(e) => store.updateGoal(g.id, { metricName: (e.target as HTMLInputElement).value })} />
            </div>
            <div class="col num">
              <label class="lb" for="etarget-{g.id}">Цель (число)</label>
              <input id="etarget-{g.id}" class="f" type="number" inputmode="numeric" min="1" value={g.metricTarget || ''}
                oninput={(e) => store.updateGoal(g.id, { metricTarget: Math.max(0, Number((e.target as HTMLInputElement).value) || 0) })} />
            </div>
          </div>
          <div class="lb">Задачи недели</div>
          {#each tacticsForGoal(d, g.id) as t (t.id)}
            <div class="trow">
              <input class="f" value={t.text} aria-label="Задача недели" oninput={(e) => store.setTacticText(t.id, (e.target as HTMLInputElement).value)} />
              <button class="x" onclick={() => delTactic(t.id, t.text)} aria-label="Удалить задачу">×</button>
            </div>
          {/each}
          <button class="addt" onclick={() => store.addTacticTo(g.id, '')}>+ Задача</button>
          <button class="btn out" onclick={() => (editingId = null)}>Готово</button>
        </div>
      {:else}
        <div class="goal">
          <span>{g.emoji}</span><b>{g.name}</b>
          <button class="edit" onclick={() => (editingId = g.id)}>Изменить</button>
        </div>
      {/if}
    {/each}
  </div>

  <div class="card">
    <div class="cl">Данные</div>
    <button class="btn" onclick={doExport}>{inTelegram ? 'Скопировать резервную копию' : 'Выгрузить в файл'}</button>
    <label class="btn out">Загрузить из файла<input type="file" accept="application/json" hidden onchange={doImport} /></label>
    {#if dataMsg}<div class="msg" class:bad={dataMsgBad} role="status">{dataMsg}</div>{/if}
    <button class="btn danger" onclick={reset}>Сбросить всё</button>
  </div>

  <div class="foot">Dr. Kazarnovskis &amp; Partners · версия {APP_VERSION}</div>
</main>
<style>
  .bd{padding:3px 16px 24px;display:flex;flex-direction:column;gap:12px}
  .h{font-size:24px;font-weight:800;letter-spacing:-.5px}
  .warn{padding:11px 13px;border-radius:12px;background:var(--red-soft);color:var(--ink);font-size:13px;font-weight:600;line-height:1.45}
  .warn.bad{color:var(--red)}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px}
  .cl{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--body)}
  .seg{display:flex;gap:6px}
  .seg button{flex:1;padding:12px 9px;border:1px solid var(--line);background:var(--bg);border-radius:9px;font:700 12px Montserrat,sans-serif;cursor:pointer;color:var(--body)}
  .seg button.act{background:var(--red);color:#fff;border-color:var(--red)}
  .goal{display:flex;align-items:center;gap:8px;font-size:14px;min-width:0}
  .goal b{overflow-wrap:anywhere;min-width:0;flex:1}
  .edit{border:none;background:none;color:var(--red);font:700 12px Montserrat,sans-serif;cursor:pointer;padding:8px 0 8px 8px;flex-shrink:0}
  .editor{display:flex;flex-direction:column;gap:8px;padding:11px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}
  .lb{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}
  .f{width:100%;padding:12px;border:1px solid var(--line);background:var(--surface);border-radius:10px;font:600 16px Montserrat,sans-serif;color:var(--ink);outline:none}
  .f:focus{border-color:var(--red)}
  .row2{display:flex;gap:8px}
  .col{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0}
  .col.num{max-width:110px}
  .trow{display:flex;gap:6px;align-items:center}
  .x{border:none;background:none;color:var(--red);font-size:22px;cursor:pointer;line-height:1;min-width:40px;min-height:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .addt{align-self:flex-start;border:none;background:none;color:var(--red);font:700 13px Montserrat,sans-serif;cursor:pointer;padding:8px 0;min-height:40px}
  .btn{padding:13px;border-radius:10px;border:none;background:var(--red);color:#fff;font:800 13px Montserrat,sans-serif;cursor:pointer;text-align:center}
  .btn.out{background:transparent;border:2px solid var(--line);color:var(--ink)}
  .btn.danger{background:transparent;color:var(--muted);border:none;font-weight:600}
  .msg{font-size:13px;font-weight:600;color:var(--body);line-height:1.45}
  .msg.bad{color:var(--red)}
  .foot{text-align:center;color:var(--muted);font-size:11px;margin-top:8px}
</style>
