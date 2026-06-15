<script lang="ts">
  import type { Store } from '../data/store.svelte';
  let { store, syncTheme }: { store: Store; syncTheme: () => void } = $props();
</script>
<div class="stub">Экран «Профиль» в разработке</div>
<style>.stub{padding:40px 16px;color:var(--muted);text-align:center}</style>
