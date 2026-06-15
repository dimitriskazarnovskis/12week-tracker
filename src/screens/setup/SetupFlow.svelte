<script lang="ts">
  import type { Store } from '../../data/store.svelte';
  import type { Goal, Tactic, GoalColorId } from '../../data/types';
  import { GOAL_COLORS, EMOJIS } from '../../data/types';
  import { genId } from '../../lib/ids';
  import { resolveTheme, sys } from '../../theme/theme.svelte';
  import logoForLight from '../../assets/logo-dual.png';
  import logoForDark from '../../assets/logo-dual-dark.png';

  let { store }: { store: Store } = $props();
  const scheme = $derived(resolveTheme(store.data.settings.theme, sys.scheme) as 'light' | 'dark');
  function localToday() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }

  const colors = Object.keys(GOAL_COLORS) as GoalColorId[];
  let step = $state(0);
  let goals = $state<Goal[]>([{ id: genId('g'), name: '', emoji: '🎯', color: 'red', metricName: '', metricTarget: 0 }]);
  let tactics = $state<Tactic[]>([]);
  let startDate = $state(localToday());

  function addGoal() {
    if (goals.length < 3) goals.push({ id: genId('g'), name: '', emoji: '📈', color: colors[goals.length % colors.length], metricName: '', metricTarget: 0 });
  }
  function removeGoal(i: number) {
    const id = goals[i].id;
    goals.splice(i, 1);
    tactics = tactics.filter((t) => t.goalId !== id);
  }
  function addTactic(goalId: string) { tactics.push({ id: genId('t'), goalId, text: '' }); }
  function removeTactic(id: string) { tactics = tactics.filter((t) => t.id !== id); }

  function next() {
    if (step === 0) {
      if (!goals.length || !goals.every((g) => g.name.trim() && g.metricName.trim() && g.metricTarget > 0))
        return alert('Заполните название, показатель и цель для каждой цели.');
    }
    if (step === 1) {
      if (!tactics.some((t) => t.text.trim())) return alert('Добавьте хотя бы одну задачу недели.');
    }
    step += 1;
  }
  function finish() {
    if (!startDate) return alert('Укажите дату старта.');
    const snapGoals = ($state.snapshot(goals) as Goal[]).map((g) => ({ ...g, name: g.name.trim(), metricName: g.metricName.trim() }));
    const snapTactics = ($state.snapshot(tactics) as Tactic[]).map((t) => ({ ...t, text: t.text.trim() })).filter((t) => t.text);
    store.setPlan({ planId: genId('p'), planVersion: 1, clientId: '', startDate, goals: snapGoals, tactics: snapTactics, calendar: [] });
  }
</script>

<div class="setup">
  <div class="brand"><img src={scheme === 'dark' ? logoForDark : logoForLight} alt="logo" /><b>Dr. Kazarnovskis <span>&amp;</span> Partners</b></div>
  <div class="steps">Шаг {step + 1} из 3</div>

  {#if step === 0}
    <h1>Цели на 12 недель</h1>
    <p class="lead">Не больше трёх. Конкретно и измеримо.</p>
    {#each goals as g, i (g.id)}
      <div class="card">
        <div class="ghead"><b>Цель {i + 1}</b>{#if goals.length > 1}<button class="x" onclick={() => removeGoal(i)}>×</button>{/if}</div>
        <input class="f" placeholder="Например: Вернуть вовлечённость" bind:value={g.name} />
        <div class="row2">
          <input class="f" placeholder="Показатель (ER, заявки…)" bind:value={g.metricName} />
          <input class="f num" type="number" placeholder="Цель" bind:value={g.metricTarget} />
        </div>
        <div class="pickrow">
          <div class="emo">{#each EMOJIS as em}<button class:sel={g.emoji === em} onclick={() => (g.emoji = em)}>{em}</button>{/each}</div>
        </div>
        <div class="cols">{#each colors as c}<button class="dot" class:sel={g.color === c} style="background:{GOAL_COLORS[c].hex}" onclick={() => (g.color = c)} aria-label={c}></button>{/each}</div>
      </div>
    {/each}
    {#if goals.length < 3}<button class="btn out" onclick={addGoal}>+ Добавить цель</button>{/if}
    <button class="btn" onclick={next}>Далее →</button>

  {:else if step === 1}
    <h1>Задачи недели</h1>
    <p class="lead">Повторяются каждую неделю. Начинайте с глагола.</p>
    {#each goals as g (g.id)}
      <div class="card">
        <div class="ghead"><b>{g.emoji} {g.name}</b></div>
        {#each tactics.filter((t) => t.goalId === g.id) as t (t.id)}
          <div class="trow"><input class="f" placeholder="Действие…" bind:value={t.text} /><button class="x" onclick={() => removeTactic(t.id)}>×</button></div>
        {/each}
        <button class="addt" onclick={() => addTactic(g.id)}>+ Задача</button>
      </div>
    {/each}
    <div class="navrow"><button class="btn out" onclick={() => (step = 0)}>← Назад</button><button class="btn" onclick={next}>Далее →</button></div>

  {:else}
    <h1>Дата старта</h1>
    <p class="lead">Лучший день — ближайший понедельник.</p>
    <div class="card"><input class="f" type="date" bind:value={startDate} /></div>
    <div class="navrow"><button class="btn out" onclick={() => (step = 1)}>← Назад</button><button class="btn" onclick={finish}>Запустить 12 недель</button></div>
  {/if}
</div>

<style>
  .setup{padding:calc(20px + env(safe-area-inset-top)) 16px 32px;display:flex;flex-direction:column;gap:12px}
  .brand{display:flex;align-items:center;gap:7px;justify-content:center;margin-bottom:4px}
  .brand img{height:20px}.brand b{font-size:11px;font-weight:700}.brand b span{color:var(--red)}
  .steps{text-align:center;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--red)}
  h1{font-size:26px;font-weight:800;letter-spacing:-.5px;line-height:1.05}
  .lead{font-size:12px;color:var(--body);margin-top:-6px}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:13px;display:flex;flex-direction:column;gap:9px}
  .ghead{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.5px}
  .x{border:none;background:none;color:var(--red);font-size:20px;cursor:pointer;line-height:1}
  .f{width:100%;padding:11px 12px;border:1px solid var(--line);background:var(--bg);border-radius:10px;font:600 13px Montserrat,sans-serif;color:var(--ink);outline:none}
  .f:focus{border-color:var(--red)}
  .row2{display:flex;gap:8px}.row2 .num{max-width:90px;text-align:center}
  .emo{display:flex;flex-wrap:wrap;gap:5px}
  .emo button{width:30px;height:30px;border:1px solid var(--line);background:var(--bg);border-radius:8px;font-size:15px;cursor:pointer}
  .emo button.sel{border-color:var(--red);background:var(--red-soft)}
  .cols{display:flex;gap:7px}
  .dot{width:26px;height:26px;border-radius:50%;border:2px solid transparent;cursor:pointer}
  .dot.sel{border-color:var(--ink);transform:scale(1.12)}
  .trow{display:flex;gap:6px;align-items:center}
  .addt{align-self:flex-start;border:none;background:none;color:var(--red);font:700 12px Montserrat,sans-serif;cursor:pointer;padding:4px 0}
  .btn{padding:13px;border-radius:11px;border:none;background:var(--red);color:#fff;font:800 13px Montserrat,sans-serif;cursor:pointer;text-align:center}
  .btn.out{background:transparent;border:2px solid var(--line);color:var(--ink)}
  .navrow{display:flex;gap:8px}.navrow .btn{flex:1}
</style>
