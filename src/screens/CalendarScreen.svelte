<script lang="ts">
  import type { Store } from '../data/store.svelte';
  import type { ContentType, EntryStatus } from '../data/types';
  let { store }: { store: Store } = $props();
  const d = $derived(store.data);
  const icon: Record<ContentType, string> = { reel: '🎬', carousel: '🎠', story: '📱', post: '📷' };
  const label: Record<EntryStatus, string> = { planned: 'Запланировано', ready: 'Готово', published: 'Опубликовано' };
  const entries = $derived([...(d.plan?.calendar ?? [])].sort((a, b) => a.date.localeCompare(b.date)));
</script>
<main class="bd">
  <h1 class="h">Контент-календарь</h1>
  {#if entries.length === 0}
    <div class="empty">План публикаций появится, когда мы его настроим.</div>
  {:else}
    {#each entries as e}
      <div class="row">
        <span class="ic">{icon[e.type]}</span>
        <div class="mid"><div class="ti">{e.title}</div><div class="dt">{e.date}</div></div>
        <span class="st {e.status}">{label[e.status]}</span>
      </div>
    {/each}
  {/if}
</main>
<style>
  .bd{padding:14px 16px 24px;display:flex;flex-direction:column;gap:10px}
  .h{font-size:24px;font-weight:800;letter-spacing:-.5px;margin-bottom:4px}
  .empty{padding:28px 14px;text-align:center;color:var(--muted);font-size:13px}
  .row{display:flex;align-items:center;gap:11px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:11px 13px}
  .ic{font-size:18px}.mid{flex:1}.ti{font-size:13px;font-weight:700}.dt{font-size:10px;color:var(--muted);margin-top:2px}
  .st{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;padding:4px 8px;border-radius:20px;background:var(--red-soft);color:var(--muted)}
  .st.published{background:var(--red);color:#fff}
</style>
