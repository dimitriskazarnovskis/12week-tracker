<script lang="ts">
  type Tab = 'week' | 'calendar' | 'progress' | 'profile';
  let { active, onNav }: { active: Tab; onNav: (t: Tab) => void } = $props();
  const tabs: { id: Tab; ic: string; label: string }[] = [
    { id: 'week', ic: '🎯', label: 'Неделя' }, { id: 'calendar', ic: '📅', label: 'Календарь' },
    { id: 'progress', ic: '📈', label: 'Прогресс' }, { id: 'profile', ic: '⚙️', label: 'Профиль' },
  ];
</script>
<nav class="nav">
  {#each tabs as t}
    <button class:act={active === t.id} onclick={() => onNav(t.id)}>
      <span class="ic">{t.ic}</span>{t.label}
    </button>
  {/each}
</nav>
<style>
  .nav{display:flex;padding:8px 8px calc(15px + env(safe-area-inset-bottom));gap:2px;background:var(--nav-bg);border-top:1px solid var(--line);position:sticky;bottom:0}
  .nav button{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font:700 8.5px Montserrat,sans-serif;color:var(--muted);background:none;border:none;cursor:pointer}
  .nav button.act{color:var(--accent-on-nav)}
  .ic{font-size:16px}
</style>
