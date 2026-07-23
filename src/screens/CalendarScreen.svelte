<script lang="ts">
  import type { Store } from '../data/store.svelte';
  import type { CalendarEntry, ContentType, EntryStatus } from '../data/types';
  import { dialogs } from '../lib/telegram';
  import { formatDay, weekOfDate, weekRange } from '../data/selectors';
  import { WEEKS } from '../data/types';
  import { resolveTheme, sys } from '../theme/theme.svelte';
  import AppHeader from '../components/AppHeader.svelte';

  let { store }: { store: Store } = $props();
  const d = $derived(store.data);
  const scheme = $derived(resolveTheme(d.settings.theme, sys.scheme) as 'light' | 'dark');
  const icon: Record<ContentType, string> = { reel: '🎬', carousel: '🎠', story: '📱', post: '📷' };
  const typeName: Record<ContentType, string> = { reel: 'Рилс', carousel: 'Карусель', story: 'Сторис', post: 'Пост' };
  const label: Record<EntryStatus, string> = { planned: 'Запланировано', ready: 'В работе', published: 'Опубликовано' };
  const nextStatus: Record<EntryStatus, EntryStatus> = { planned: 'ready', ready: 'published', published: 'planned' };
  const entries = $derived([...(d.plan?.calendar ?? [])].sort((a, b) => a.date.localeCompare(b.date)));
  // Группировка по неделям программы: «Неделя N · даты», до старта и после 12 недель — отдельно.
  function groupLabel(date: string): string {
    const start = d.plan!.startDate;
    const w = weekOfDate(start, date);
    if (w < 1) return 'До старта программы';
    if (w > WEEKS) return 'После 12 недель';
    return `Неделя ${w} · ${weekRange(start, w)}`;
  }
  const groups = $derived.by(() => {
    const out: { label: string; items: CalendarEntry[] }[] = [];
    for (const e of entries) {
      const label = groupLabel(e.date);
      if (out.length === 0 || out[out.length - 1].label !== label) out.push({ label, items: [] });
      out[out.length - 1].items.push(e);
    }
    return out;
  });

  function toLocalISO(dt: Date) { const c = new Date(dt); c.setMinutes(c.getMinutes() - c.getTimezoneOffset()); return c.toISOString().slice(0, 10); }
  let adding = $state(false);
  let fDate = $state(toLocalISO(new Date()));
  let fType = $state<ContentType>('reel');
  let fTitle = $state('');
  let fErr = $state('');

  // редактирование существующей записи по нажатию на неё
  let editId = $state<string | null>(null);
  let eDate = $state(''); let eType = $state<ContentType>('reel'); let eTitle = $state('');
  function startEdit(e: CalendarEntry) {
    editId = e.id; eDate = e.date; eType = e.type; eTitle = e.title; fErr = '';
  }
  function saveEdit() {
    if (!eTitle.trim() || !eDate) return;
    store.updateCalendarEntry(editId!, { date: eDate, type: eType, title: eTitle.trim() });
    editId = null;
  }

  function toggleTheme() { store.setTheme(scheme === 'dark' ? 'light' : 'dark'); }
  function addEntry() {
    if (!fTitle.trim()) { fErr = 'Напишите, что публикуем.'; return; }
    if (!fDate) { fErr = 'Выберите дату.'; return; }
    store.addCalendarEntry({ date: fDate, type: fType, title: fTitle.trim(), status: 'planned' });
    fTitle = ''; fErr = ''; adding = false;
  }
  function cycle(e: CalendarEntry) { store.updateCalendarEntry(e.id, { status: nextStatus[e.status] }); }
  async function del(e: CalendarEntry) {
    if (await dialogs.confirm(`Удалить «${e.title}»?`)) store.removeCalendarEntry(e.id);
  }
</script>
<AppHeader {scheme} onToggle={toggleTheme} />
<main class="bd">
  <div class="head">
    <h1 class="h">Контент-календарь</h1>
    <button class="add" onclick={() => { adding = !adding; fErr = ''; }}>{adding ? 'Скрыть' : '+ Публикация'}</button>
  </div>

  {#if adding}
    <div class="card" oninput={() => { if (fErr) fErr = ''; }}>
      <div class="row2">
        <div class="col">
          <label class="lb" for="cal-date">Дата</label>
          <input id="cal-date" class="f" type="date" bind:value={fDate} />
        </div>
        <div class="col">
          <label class="lb" for="cal-type">Формат</label>
          <select id="cal-type" class="f" bind:value={fType}>
            {#each Object.keys(typeName) as t}
              <option value={t}>{icon[t as ContentType]} {typeName[t as ContentType]}</option>
            {/each}
          </select>
        </div>
      </div>
      <label class="lb" for="cal-title">Что публикуем</label>
      <input id="cal-title" class="f" placeholder="Например: Рилс про отзыв клиента" bind:value={fTitle} />
      {#if fErr}<div class="err" role="alert">{fErr}</div>{/if}
      <button class="btn" onclick={addEntry}>Добавить в план</button>
    </div>
  {/if}

  {#if entries.length === 0 && !adding}
    <div class="empty">
      <p>Пока нет публикаций.</p>
      <button class="btn" onclick={() => (adding = true)}>Добавить первую</button>
    </div>
  {:else}
    {#each groups as g (g.label)}
      <div class="wkhead">{g.label}</div>
    {#each g.items as e (e.id)}
      {#if editId === e.id}
        <div class="card">
          <div class="row2">
            <div class="col">
              <label class="lb" for="edit-date">Дата</label>
              <input id="edit-date" class="f" type="date" bind:value={eDate} />
            </div>
            <div class="col">
              <label class="lb" for="edit-type">Формат</label>
              <select id="edit-type" class="f" bind:value={eType}>
                {#each Object.keys(typeName) as t}
                  <option value={t}>{icon[t as ContentType]} {typeName[t as ContentType]}</option>
                {/each}
              </select>
            </div>
          </div>
          <label class="lb" for="edit-title">Название</label>
          <input id="edit-title" class="f" bind:value={eTitle} />
          <div class="erow">
            <button class="btn out" onclick={() => (editId = null)}>Отмена</button>
            <button class="btn" onclick={saveEdit}>Сохранить</button>
          </div>
        </div>
      {:else}
        <div class="row">
          <span class="ic" title={typeName[e.type]}>{icon[e.type]}</span>
          <button class="mid" onclick={() => startEdit(e)} aria-label="Изменить «{e.title}»">
            <div class="ti">{e.title}</div><div class="dt">{formatDay(e.date)} · нажмите, чтобы изменить</div>
          </button>
          <button class="st {e.status}" onclick={() => cycle(e)} aria-label="Статус: {label[e.status]}. Нажмите, чтобы изменить">{label[e.status]}</button>
          <button class="x" onclick={() => del(e)} aria-label="Удалить «{e.title}»">×</button>
        </div>
      {/if}
    {/each}
    {/each}
  {/if}
</main>
<style>
  .bd{padding:3px 16px 24px;display:flex;flex-direction:column;gap:10px}
  .wkhead{font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-top:8px}
  .head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px}
  .h{font-size:24px;font-weight:800;letter-spacing:-.5px}
  .add{border:none;background:none;color:var(--red);font:800 13px Montserrat,sans-serif;cursor:pointer;padding:10px 0 10px 10px;flex-shrink:0}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:13px;display:flex;flex-direction:column;gap:8px}
  .lb{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}
  .f{width:100%;padding:12px;border:1px solid var(--line);background:var(--bg);border-radius:10px;font:600 16px Montserrat,sans-serif;color:var(--ink);outline:none}
  .f:focus{border-color:var(--red)}
  .row2{display:flex;gap:8px}
  .col{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0}
  .err{padding:10px 12px;border-radius:10px;background:var(--red-soft);color:var(--red);font-size:13px;font-weight:700}
  .btn{padding:13px;border-radius:10px;border:none;background:var(--red);color:#fff;font:800 13px Montserrat,sans-serif;cursor:pointer;text-align:center}
  .empty{padding:28px 14px;text-align:center;color:var(--muted);font-size:13px;display:flex;flex-direction:column;gap:12px;align-items:center}
  .empty .btn{min-width:200px}
  .row{display:flex;align-items:center;gap:9px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:9px 11px}
  .ic{font-size:18px;flex-shrink:0}
  .mid{flex:1;min-width:0;background:none;border:none;padding:0;text-align:left;cursor:pointer;font-family:inherit;color:inherit}
  .ti{font-size:14px;font-weight:700;overflow-wrap:anywhere}.dt{font-size:11px;color:var(--muted);margin-top:2px}
  .erow{display:flex;gap:8px}
  .erow .btn{flex:1}
  .btn.out{background:transparent;border:2px solid var(--line);color:var(--ink)}
  .st{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;padding:9px 10px;border-radius:20px;background:var(--red-soft);color:var(--body);flex-shrink:0;border:none;cursor:pointer;min-height:36px}
  /* светофор Дмитрия: серый = запланировано, красный = в работе, зелёный = опубликовано */
  .st.ready{background:var(--red);color:#fff}
  .st.published{background:#2E8B57;color:#fff}
  .x{border:none;background:none;color:var(--muted);font-size:20px;cursor:pointer;line-height:1;min-width:36px;min-height:36px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
</style>
