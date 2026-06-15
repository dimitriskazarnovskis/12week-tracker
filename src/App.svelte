<script lang="ts">
  import './theme/theme.css';
  import { onMount } from 'svelte';
  import { createStore } from './data/store.svelte';
  import { localAdapter, cloudAdapter } from './data/storage';
  import { tg } from './lib/telegram';
  import { resolveTheme, applyTheme, sys } from './theme/theme.svelte';
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
  onMount(async () => {
    tg().init();
    sys.scheme = tg().colorScheme();
    await store.load();
    syncTheme();
    tg().onThemeChanged(() => { sys.scheme = tg().colorScheme(); syncTheme(); });
  });
  $effect(() => { void store.data.settings.theme; void sys.scheme; syncTheme(); });
</script>

{#if store.status === 'error'}
  <div class="splash">
    <div>
      <p>Не удалось загрузить данные.</p>
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
  {#if tab === 'profile'}<ProfileScreen {store} {syncTheme} />{/if}
  <BottomNav active={tab} onNav={(t) => tab = t} />
{/if}

<style>
  .splash{display:flex;align-items:center;justify-content:center;min-height:100vh;color:var(--muted);font-weight:600;text-align:center;padding:24px}
  .retry{margin-top:12px;padding:10px 22px;border:none;border-radius:10px;background:var(--red);color:#fff;font:800 13px Montserrat,sans-serif;cursor:pointer}
</style>
