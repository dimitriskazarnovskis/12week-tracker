<script lang="ts">
  import type { Store } from '../../data/store.svelte';
  import type { Goal, Tactic, GoalColorId } from '../../data/types';
  import { GOAL_COLORS, EMOJIS } from '../../data/types';
  import { genId } from '../../lib/ids';
  import { tg } from '../../lib/telegram';
  import { formatDay } from '../../data/selectors';
  import { resolveTheme, sys } from '../../theme/theme.svelte';
  import logoForLight from '../../assets/logo-dual.png';
  import logoForDark from '../../assets/logo-dual-dark.png';

  let { store }: { store: Store } = $props();
  const scheme = $derived(resolveTheme(store.data.settings.theme, sys.scheme) as 'light' | 'dark');

  const COLOR_NAMES: Record<GoalColorId, string> = {
    red: 'красный', ink: 'чёрный', green: 'зелёный', blue: 'синий', purple: 'фиолетовый', amber: 'янтарный',
  };

  function toLocalISO(d: Date) { const c = new Date(d); c.setMinutes(c.getMinutes() - c.getTimezoneOffset()); return c.toISOString().slice(0, 10); }
  function nextMonday(): string {
    const d = new Date();
    const add = d.getDay() === 1 ? 0 : ((8 - d.getDay()) % 7 || 7);
    d.setDate(d.getDate() + add);
    return toLocalISO(d);
  }

  // Draft survives an accidental swipe-down / reload — losing 10 minutes of typing
  // on the very first screen would be the worst possible first impression.
  const DRAFT_KEY = 'kd_setup_draft';
  type Draft = { step: number; goals: Goal[]; tactics: Tactic[]; startDate: string };
  function loadDraft(): Draft | null {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
      return d && Array.isArray(d.goals) ? d : null;
    } catch { return null; }
  }
  const draft = loadDraft();

  const colors = Object.keys(GOAL_COLORS) as GoalColorId[];
  // −1 = приветствие с объяснением метода; показывается один раз, до первого черновика
  let step = $state(draft?.step ?? -1);
  let goals = $state<Goal[]>(draft?.goals?.length ? draft.goals : [{ id: genId('g'), name: '', emoji: '🎯', color: 'red', metricName: '', metricTarget: 0 }]);
  let tactics = $state<Tactic[]>(draft?.tactics ?? []);
  let startDate = $state(draft?.startDate ?? nextMonday());
  let err = $state('');

  const dirty = $derived(goals.some(g => g.name.trim() || g.metricName.trim() || g.metricTarget > 0) || tactics.some(t => t.text.trim()));
  $effect(() => {
    const snap: Draft = { step, goals: $state.snapshot(goals) as Goal[], tactics: $state.snapshot(tactics) as Tactic[], startDate };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(snap)); } catch {}
  });
  $effect(() => { tg().closingConfirmation(dirty); });

  // Telegram's back control steps the wizard back instead of killing the whole Mini App.
  const backHandler = () => { if (step > 0) { step -= 1; err = ''; } };
  $effect(() => {
    if (step > 0) tg().showBack(backHandler); else tg().hideBack(backHandler);
    return () => tg().hideBack(backHandler);
  });

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
    if (step === 0 && (!goals.length || !goals.every((g) => g.name.trim() && g.metricName.trim() && g.metricTarget > 0))) {
      err = 'Заполните название, показатель и цель (число больше нуля) для каждой цели.';
      return;
    }
    if (step === 1 && !tactics.some((t) => t.text.trim())) {
      err = 'Добавьте хотя бы одну задачу недели.';
      return;
    }
    err = '';
    step += 1;
  }
  function finish() {
    if (!startDate) { err = 'Укажите дату старта.'; return; }
    const snapGoals = ($state.snapshot(goals) as Goal[]).map((g) => ({ ...g, name: g.name.trim(), metricName: g.metricName.trim() }));
    const snapTactics = ($state.snapshot(tactics) as Tactic[]).map((t) => ({ ...t, text: t.text.trim() })).filter((t) => t.text);
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    tg().closingConfirmation(false);
    store.setPlan({ planId: genId('p'), planVersion: 1, clientId: '', startDate, goals: snapGoals, tactics: snapTactics, calendar: [] });
  }
</script>

<div class="setup" oninput={() => { if (err) err = ''; }}>
  <div class="brand"><img src={scheme === 'dark' ? logoForDark : logoForLight} alt="Логотип Dr. Kazarnovskis & Partners" /><b>Dr. Kazarnovskis <span>&amp;</span> Partners</b></div>
  {#if step >= 0}<div class="steps">Шаг {step + 1} из 3</div>{/if}

  {#if step === -1}
    <h1>12 недель к цели</h1>
    <p class="lead">Ваш трекер маркетинговых целей: достаточно коротко, чтобы не откладывать, — достаточно долго, чтобы увидеть результат.</p>
    <div class="card">
      <div class="hrow"><span class="n">1</span><p><b>1–3 цели</b> с измеримым показателем — например, вовлечённость или заявки.</p></div>
      <div class="hrow"><span class="n">2</span><p><b>Задачи недели</b> — конкретные действия, которые повторяются каждую неделю.</p></div>
      <div class="hrow"><span class="n">3</span><p><b>Отмечайте сделанное</b> — приложение считает процент выполнения недели. 85% и выше — отличная неделя!</p></div>
      <div class="hrow"><span class="n">4</span><p><b>Итог недели</b> — пара фраз в конце недели: что сработало, что меняем.</p></div>
    </div>
    <button class="btn" onclick={() => (step = 0)}>Начать настройку · 2–3 минуты</button>

  {:else if step === 0}
    <h1>Цели на 12 недель</h1>
    <p class="lead">Не больше трёх. Конкретно и измеримо.</p>
    {#each goals as g, i (g.id)}
      <div class="card">
        <div class="ghead"><b>Цель {i + 1}</b>{#if goals.length > 1}<button class="x" onclick={() => removeGoal(i)} aria-label="Удалить цель {i + 1}">×</button>{/if}</div>
        <label class="lb" for="gname-{g.id}">Название цели</label>
        <input id="gname-{g.id}" class="f" class:bad={!!err && !g.name.trim()} placeholder="Например: Вернуть вовлечённость" bind:value={g.name} />
        <div class="row2">
          <div class="col">
            <label class="lb" for="gmetric-{g.id}">Показатель</label>
            <input id="gmetric-{g.id}" class="f" class:bad={!!err && !g.metricName.trim()} placeholder="ER, заявки…" bind:value={g.metricName} />
          </div>
          <div class="col num">
            <label class="lb" for="gtarget-{g.id}">Цель (число)</label>
            <input id="gtarget-{g.id}" class="f num" class:bad={!!err && !(g.metricTarget > 0)} type="number" inputmode="numeric" min="1" placeholder="25"
              value={g.metricTarget || ''} oninput={(e) => (g.metricTarget = Math.max(0, Number((e.target as HTMLInputElement).value) || 0))} />
          </div>
        </div>
        <div class="pickrow">
          <div class="emo">{#each EMOJIS as em}<button class:sel={g.emoji === em} onclick={() => (g.emoji = em)} aria-label="Эмодзи {em}" aria-pressed={g.emoji === em}>{em}</button>{/each}</div>
        </div>
        <div class="cols">{#each colors as c}<button class="dot" class:sel={g.color === c} style="background:{GOAL_COLORS[c].hex}" onclick={() => (g.color = c)} aria-label="Цвет: {COLOR_NAMES[c]}" aria-pressed={g.color === c}></button>{/each}</div>
      </div>
    {/each}
    {#if err}<div class="err" role="alert">{err}</div>{/if}
    {#if goals.length < 3}<button class="btn out" onclick={addGoal}>+ Добавить цель</button>{/if}
    <button class="btn" onclick={next}>Далее →</button>

  {:else if step === 1}
    <h1>Задачи недели</h1>
    <p class="lead">Повторяются каждую неделю. Начинайте с глагола.</p>
    {#each goals as g (g.id)}
      <div class="card">
        <div class="ghead"><b>{g.emoji} {g.name}</b></div>
        {#each tactics.filter((t) => t.goalId === g.id) as t (t.id)}
          <div class="trow"><input class="f" placeholder="Действие…" aria-label="Задача недели" bind:value={t.text} /><button class="x" onclick={() => removeTactic(t.id)} aria-label="Удалить задачу">×</button></div>
        {/each}
        <button class="addt" onclick={() => addTactic(g.id)}>+ Задача</button>
      </div>
    {/each}
    {#if err}<div class="err" role="alert">{err}</div>{/if}
    <div class="navrow"><button class="btn out" onclick={() => { step = 0; err = ''; }}>← Назад</button><button class="btn" onclick={next}>Далее →</button></div>

  {:else}
    <h1>Дата старта</h1>
    <p class="lead">Лучший день — понедельник, мы уже подставили ближайший.</p>
    <div class="card">
      <label class="lb" for="startdate">Первый день 12 недель</label>
      <input id="startdate" class="f" type="date" bind:value={startDate} />
      {#if startDate}<div class="hint">Старт: {formatDay(startDate)}</div>{/if}
    </div>
    {#if err}<div class="err" role="alert">{err}</div>{/if}
    <div class="navrow"><button class="btn out" onclick={() => { step = 1; err = ''; }}>← Назад</button><button class="btn" onclick={finish}>Запустить 12 недель</button></div>
  {/if}
</div>

<style>
  .setup{padding:calc(20px + env(safe-area-inset-top)) 16px 32px;display:flex;flex-direction:column;gap:12px}
  .brand{display:flex;align-items:center;gap:7px;justify-content:center;margin-bottom:4px}
  .brand img{height:20px}.brand b{font-size:11px;font-weight:700}.brand b span{color:var(--red)}
  .steps{text-align:center;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--red)}
  h1{font-size:26px;font-weight:800;letter-spacing:-.5px;line-height:1.05}
  .lead{font-size:13px;color:var(--body);margin-top:-6px}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:13px;display:flex;flex-direction:column;gap:8px}
  .ghead{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;min-width:0}
  .ghead b{overflow-wrap:anywhere}
  .x{border:none;background:none;color:var(--red);font-size:22px;cursor:pointer;line-height:1;min-width:40px;min-height:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .lb{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}
  /* 16px: anything smaller makes iOS zoom the whole page on focus */
  .f{width:100%;padding:12px;border:1px solid var(--line);background:var(--bg);border-radius:10px;font:600 16px Montserrat,sans-serif;color:var(--ink);outline:none}
  .f:focus{border-color:var(--red)}
  .f.bad{border-color:var(--red);background:var(--red-soft)}
  .row2{display:flex;gap:8px}
  .col{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0}
  .col.num{max-width:110px}
  .col .f.num{text-align:center}
  .pickrow{margin-top:2px}
  .emo{display:flex;flex-wrap:wrap;gap:6px}
  .emo button{width:38px;height:38px;border:1px solid var(--line);background:var(--bg);border-radius:9px;font-size:17px;cursor:pointer}
  .emo button.sel{border-color:var(--red);background:var(--red-soft)}
  .cols{display:flex;gap:8px}
  .dot{width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer}
  .dot.sel{border-color:var(--ink);transform:scale(1.1)}
  .trow{display:flex;gap:6px;align-items:center}
  .addt{align-self:flex-start;border:none;background:none;color:var(--red);font:700 13px Montserrat,sans-serif;cursor:pointer;padding:8px 0;min-height:40px}
  .err{padding:11px 13px;border-radius:10px;background:var(--red-soft);color:var(--red);font-size:13px;font-weight:700;line-height:1.45}
  .hrow{display:flex;gap:11px;align-items:flex-start}
  .hrow .n{flex-shrink:0;width:26px;height:26px;border-radius:50%;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800}
  .hrow p{font-size:14px;line-height:1.5;color:var(--body);margin-top:2px}
  .hrow b{color:var(--ink)}
  .hint{font-size:13px;font-weight:600;color:var(--body)}
  .btn{padding:14px;border-radius:11px;border:none;background:var(--red);color:#fff;font:800 14px Montserrat,sans-serif;cursor:pointer;text-align:center}
  .btn.out{background:transparent;border:2px solid var(--line);color:var(--ink)}
  .navrow{display:flex;gap:8px}.navrow .btn{flex:1}
</style>
