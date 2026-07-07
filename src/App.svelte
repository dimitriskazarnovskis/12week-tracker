<script lang="ts">
  import './theme/theme.css';
  import { onMount } from 'svelte';
  import { createStore } from './data/store.svelte';
  import { localAdapter, cloudAdapter } from './data/storage';
  import { tg } from './lib/telegram';
  import { resolveTheme, applyTheme, sys, watchSystemScheme } from './theme/theme.svelte';
  import BottomNav from './components/BottomNav.svelte';
  import WeekScreen from './screens/WeekScreen.svelte';
  import CalendarScreen from './screens/CalendarScreen.svelte';
  import ProgressScreen from './screens/ProgressScreen.svelte';
  import ProfileScreen from './screens/ProfileScreen.svelte';
  import SetupFlow from './screens/setup/SetupFlow.svelte';

  const store = createStore(localAdapter(), cloudAdapter());
  let tab = $state<'week' | 'calendar' | 'progress' | 'profile'>('week');

  function syncTheme() {
    applyTheme(resolveTheme(store.data.settings.theme, sys.scheme));
  }
  onMount(() => {
    tg().init();
    const inTelegram = tg().isTMA();
    if (inTelegram) {
      sys.scheme = tg().colorScheme();
      tg().onThemeChanged(() => { sys.scheme = tg().colorScheme(); });
    }
    const unwatch = watchSystemScheme(inTelegram, s => { sys.scheme = s; });
    store.load();
    return unwatch;
  });
  // Theme follows settings only after load: the pre-paint guard in index.html must not
  // be overwritten with defaults while data is still loading.
  $effect(() => {
    if (store.status !== 'ready') return;
    void store.data.settings.theme; void sys.scheme;
    syncTheme();
  });
  // The webview can be dismissed at any moment: push pending cloud writes out immediately.
  $effect(() => {
    const flush = () => { store.flushNow(); };
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onHide); };
  });
</script>

{#if store.status === 'error'}
  <div class="splash">
    <div>
      <p>{store.error ?? 'Не удалось загрузить данные.'}</p>
      <button class="retry" onclick={() => location.reload()}>Повторить</button>
    </div>
  </div>
{:else if store.status !== 'ready'}
  <div class="splash">Загрузка…</div>
{:else if !store.data.plan}
  <SetupFlow {store} />
{:else}
  {#if tab === 'week'}<WeekScreen {store} />{/if}
  {#if tab === 'calendar'}<CalendarScreen {store} />{/if}
  {#if tab === 'progress'}<ProgressScreen {store} />{/if}
  {#if tab === 'profile'}<ProfileScreen {store} />{/if}
  <BottomNav active={tab} onNav={(t) => tab = t} />
{/if}

<style>
  .splash{display:flex;align-items:center;justify-content:center;min-height:100dvh;color:var(--muted);font-weight:600;text-align:center;padding:24px;line-height:1.5}
  .retry{margin-top:12px;padding:12px 24px;border:none;border-radius:10px;background:var(--red);color:#fff;font:800 14px Montserrat,sans-serif;cursor:pointer}
</style>
