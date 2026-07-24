<script module lang="ts">
  // Persisted per device: confetti fires once per week EVER, not on every app open.
  const CELEB_KEY = 'kd_celebrated';
  function loadCelebrated(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(CELEB_KEY) ?? '[]')); } catch { return new Set(); }
  }
  const celebrated = loadCelebrated();
  function markCelebrated(key: string) {
    celebrated.add(key);
    try { localStorage.setItem(CELEB_KEY, JSON.stringify([...celebrated])); } catch {}
  }
</script>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { Store } from '../data/store.svelte';
  import { tg } from '../lib/telegram';
  import { resolveTheme, sys } from '../theme/theme.svelte';
  import { weekScore, currentWeek, tacticsForGoal, programState, weekRange, formatDay, overallStats, todayISO as todayIso } from '../data/selectors';
  import { WEEKS } from '../data/types';
  import AppHeader from '../components/AppHeader.svelte';
  import WeekStrip from '../components/WeekStrip.svelte';
  import ScoreRing from '../components/ScoreRing.svelte';
  import KpiTile from '../components/KpiTile.svelte';
  import TaskRow from '../components/TaskRow.svelte';
  import Confetti from '../components/Confetti.svelte';
  import WeekFeedback from '../components/WeekFeedback.svelte';
  import { pickWeekFeedback, type WeekFeedbackText } from '../lib/motivation';

  let { store }: { store: Store } = $props();
  const d = $derived(store.data);
  // svelte-ignore state_referenced_locally -- intentionally captures the week at mount time
  let week = $state(currentWeek(store.data.plan!.startDate, new Date()));
  const score = $derived(weekScore(d, week));
  const block = $derived(week <= 4 ? 'Блок 1 · Привычка' : week <= 8 ? 'Блок 2 · Ускорение' : 'Блок 3 · Финиш');
  const scheme = $derived(resolveTheme(d.settings.theme, sys.scheme) as 'light' | 'dark');
  const hasTactics = $derived((d.plan?.tactics?.length ?? 0) > 0);
  const today = $derived(currentWeek(d.plan!.startDate, new Date()));
  const pstate = $derived(programState(d.plan!.startDate, new Date()));
  // Future weeks are view-only: pre-checking week 12 on day one would fake the stats.
  const locked = $derived(pstate === 'before' || week > today);
  const range = $derived(weekRange(d.plan!.startDate, week));
  const clientName = $derived(d.plan?.clientName || tg().userFirstName() || '');

  // Итог прошедшей недели — тёплое окошко, один раз на неделю на устройстве.
  let weekFeedback = $state<WeekFeedbackText | null>(null);
  let feedbackTag = '';
  onMount(() => {
    if (pstate === 'before') return;
    const lastWeek = pstate === 'done' ? WEEKS : today - 1;
    if (lastWeek < 1) return;
    feedbackTag = `${d.plan?.planId ?? ''}:${lastWeek}`;
    try {
      const shown: string[] = JSON.parse(localStorage.getItem('kd_weekfb') ?? '[]');
      if (shown.includes(feedbackTag)) return;
    } catch {}
    weekFeedback = pickWeekFeedback(clientName, lastWeek, weekScore(d, lastWeek));
  });
  function closeFeedback() {
    weekFeedback = null;
    try {
      const shown: string[] = JSON.parse(localStorage.getItem('kd_weekfb') ?? '[]');
      shown.push(feedbackTag);
      localStorage.setItem('kd_weekfb', JSON.stringify(shown.slice(-60)));
    } catch {}
  }

  let showConfetti = $state(false);
  $effect(() => {
    const key = `${d.plan?.planId ?? ''}:${week}`;
    if (score >= 85 && !celebrated.has(key)) {
      markCelebrated(key);
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      if (!reduced) {
        tg().haptic('success');
        showConfetti = true;
        setTimeout(() => (showConfetti = false), 1800);
      }
    }
  });

  function toggle(taskId: string) {
    if (locked) return;
    tg().haptic('light');
    store.toggleTask(week, taskId);
  }
  function toggleTheme() { store.setTheme(scheme === 'dark' ? 'light' : 'dark'); }

  let reflectTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingReflect: { week: number; text: string } | null = null;
  function onReflect(e: Event) {
    const targetWeek = week; // capture: week may change before the timer fires
    const text = (e.target as HTMLTextAreaElement).value;
    pendingReflect = { week: targetWeek, text };
    clearTimeout(reflectTimer);
    reflectTimer = setTimeout(() => { pendingReflect = null; store.setReflection(targetWeek, text); }, 500);
  }
  function flushReflect(e: Event) {
    clearTimeout(reflectTimer); pendingReflect = null;
    store.setReflection(week, (e.target as HTMLTextAreaElement).value);
  }
  // The Mini App can be swiped away mid-typing: commit the pending reflection
  // (and the debounced cloud write) the moment the webview hides or the tab unmounts.
  function commitPending() {
    if (reflectTimer) { clearTimeout(reflectTimer); reflectTimer = undefined; }
    if (pendingReflect) { const p = pendingReflect; pendingReflect = null; store.setReflection(p.week, p.text); }
    store.flushNow();
  }
  $effect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') commitPending(); };
    window.addEventListener('pagehide', commitPending);
    document.addEventListener('visibilitychange', onHide);
    return () => { window.removeEventListener('pagehide', commitPending); document.removeEventListener('visibilitychange', onHide); };
  });
  onDestroy(commitPending);
</script>

{#if showConfetti}<Confetti />{/if}
{#if weekFeedback}<WeekFeedback feedback={weekFeedback} onClose={closeFeedback} />{/if}
<AppHeader {scheme} onToggle={toggleTheme} />
<WeekStrip current={week} todayWeek={pstate === 'active' ? today : pstate === 'done' ? WEEKS + 1 : 0} onPick={(w) => (week = w)} />
<main class="bd">
  <div>
    {#if clientName}<div class="hello">Привет, {clientName}! 👋</div>{/if}
    <div class="eyebrow">{block}</div>
    <h1 class="wk">Неделя {week}</h1>
    <div class="range">{range}</div>
  </div>

  {#if pstate === 'before'}
    <div class="notice">Сегодня {formatDay(todayIso())}. Программа начнётся {formatDay(d.plan!.startDate)}, задачи откроются автоматически в день старта.</div>
  {:else if pstate === 'done'}
    <div class="notice fin">12 недель завершены! Средний балл {overallStats(d).avgScore}%. Итоги ждут во вкладке «Прогресс».</div>
  {:else if locked}
    <div class="notice">Неделя {week} ({range}) ещё не началась. Отметки откроются в её первый день.</div>
  {/if}

  <div class="herorow">
    <ScoreRing value={score} />
    <div class="kpis">
      {#each d.plan!.goals as g (g.id)}
        <KpiTile label={g.metricName} value={d.progress.kpis[`${week}:${g.id}`] ?? 0} target={g.metricTarget}
          readonly={locked} onChange={(v) => store.saveKpi(week, g.id, v)} />
      {/each}
    </div>
  </div>

  <div class="sec">Задачи недели</div>
  {#if hasTactics}
    {#each d.plan!.goals as g (g.id)}
      {#each tacticsForGoal(d, g.id) as t (t.id)}
        <TaskRow text={t.text} done={!!d.progress.checks[`${week}:${t.id}`]} disabled={locked} onToggle={() => toggle(t.id)} />
      {/each}
    {/each}
  {:else}
    <div class="empty">Задачи на неделю появятся, когда мы настроим план.</div>
  {/if}

  {#if week <= today && pstate !== 'before'}
    <div class="sec">Итог недели</div>
    <textarea class="reflect" placeholder="Что зашло, что меняем на следующей неделе?"
      value={d.progress.reflections[`${week}`] ?? ''} oninput={onReflect} onblur={flushReflect}></textarea>
  {/if}
</main>

<style>
  .bd{padding:6px 16px 28px;display:flex;flex-direction:column;gap:18px}
  .hello{font-size:14px;font-weight:700;color:var(--body);margin-bottom:10px}
  .eyebrow{font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:var(--red)}
  .wk{font-size:29px;font-weight:800;letter-spacing:-.5px;line-height:1;margin-top:2px}
  .range{font-size:13px;font-weight:600;color:var(--muted);margin-top:6px}
  .notice{padding:14px 16px;border-radius:12px;background:var(--red-soft,#FCEAEC);color:var(--ink);font-size:13px;font-weight:600;line-height:1.45}
  .notice.fin{background:var(--surface);border:1px solid var(--line)}
  .herorow{display:flex;align-items:center;gap:13px}
  .kpis{display:flex;gap:8px;flex:1;flex-wrap:wrap;min-width:0}
  .sec{font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);margin-top:6px}
  .empty{padding:18px;text-align:center;color:var(--muted);font-size:13px;background:var(--surface);border:1px solid var(--line);border-radius:12px}
  .reflect{width:100%;min-height:76px;resize:none;border-radius:12px;border:1px solid var(--line);background:var(--surface);
    color:var(--ink);font:500 16px Montserrat,sans-serif;padding:11px 13px;line-height:1.5;outline:none}
  .reflect:focus{border-color:var(--red)}
</style>
