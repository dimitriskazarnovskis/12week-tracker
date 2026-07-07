<script lang="ts">
  import Icon, { type IconName } from './Icon.svelte';
  type Tab = 'week' | 'calendar' | 'progress' | 'profile';
  let { active, onNav }: { active: Tab; onNav: (t: Tab) => void } = $props();
  const tabs: { id: Tab; icon: IconName; label: string }[] = [
    { id: 'week', icon: 'target', label: 'Неделя' }, { id: 'calendar', icon: 'calendar', label: 'Календарь' },
    { id: 'progress', icon: 'chart', label: 'Прогресс' }, { id: 'profile', icon: 'gear', label: 'Профиль' },
  ];
</script>
<nav class="nav">
  {#each tabs as t}
    <button class:act={active === t.id} onclick={() => onNav(t.id)} aria-current={active === t.id ? 'page' : undefined}>
      <Icon name={t.icon} size={19} />{t.label}
    </button>
  {/each}
</nav>
<style>
  /* margin-top:auto: #app is a min-height:100dvh flex column, so the bar sits at the
     bottom even on short screens (empty calendar/profile) instead of floating mid-page */
  .nav{display:flex;padding:6px 8px calc(12px + env(safe-area-inset-bottom));gap:2px;background:var(--nav-bg);
    border-top:1px solid var(--line);position:sticky;bottom:0;margin-top:auto;z-index:10}
  .nav button{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:48px;
    font:700 11px Montserrat,sans-serif;color:var(--muted);background:none;border:none;cursor:pointer;border-radius:10px}
  .nav button.act{color:var(--accent-on-nav)}
</style>
