import type { StorageAdapter } from './storage/adapter';
import type { AppData, CalendarEntry, Goal, MonthlyReport, Plan, ThemePref } from './types';
import type { ConsultantUpdate } from './exportImport';
import { checkKey, emptyProgress, kpiKey, WEEKS } from './types';
import { migrate, CURRENT_VERSION } from './migrations';
import { genId, now } from '../lib/ids';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export function createStore(local: StorageAdapter, cloud: StorageAdapter | null) {
  let data = $state<AppData>(migrate(null));
  let status = $state<Status>('idle');
  let error = $state<string | null>(null);
  let saveError = $state<string | null>(null);
  let cloudOk = $state(true);
  let cloudChain: Promise<void> = Promise.resolve();
  let cloudTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSnap: AppData | null = null;

  // Cloud writes are coalesced (500ms trailing) — a burst of taps becomes one
  // sharded CloudStorage save instead of one per keystroke.
  function queueCloudSave() {
    if (!cloud) return;
    pendingSnap = $state.snapshot(data) as AppData;
    if (cloudTimer) clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => { flushCloud(); }, 500);
  }
  // Сетевая заминка ≠ тревога: повторяем сами с растущими паузами; баннер клиенту —
  // только после ДВУХ подряд неудач (одиночные сбои на мобильной сети — норма).
  let cloudFails = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleCloudRetry() {
    if (retryTimer || !cloud) return;
    const delay = Math.min(120_000, 15_000 * Math.pow(2, Math.min(cloudFails - 1, 3)));
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (!pendingSnap) pendingSnap = $state.snapshot(data) as AppData;
      flushCloud();
    }, delay);
  }
  function flushCloud(): Promise<void> {
    if (cloudTimer) { clearTimeout(cloudTimer); cloudTimer = null; }
    if (cloud && pendingSnap) {
      const snap = pendingSnap; pendingSnap = null;
      cloudChain = cloudChain
        .then(() => cloud.save(snap))
        .then(() => { cloudFails = 0; cloudOk = true; })
        .catch(() => { cloudFails += 1; cloudOk = cloudFails < 2; scheduleCloudRetry(); });
    }
    return cloudChain;
  }

  async function persist() {
    data.meta.updatedAt = now();
    try { await local.save(data); saveError = null; }
    catch (e) { saveError = String(e); }
    queueCloudSave();
  }

  // Страховка перед разрушающими операциями (замена плана, сброс):
  // прежние данные прячутся на устройстве и восстанавливаются кнопкой в Профиле.
  const BACKUP_KEY = 'kd_backup_prev';
  let backupAt = $state<string | null>(null);
  try { backupAt = JSON.parse(localStorage.getItem(BACKUP_KEY) ?? 'null')?.when ?? null; } catch {}
  function stashBackup() {
    if (!data.plan) return; // нечего беречь
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify({ when: now(), data: $state.snapshot(data) }));
      backupAt = now();
    } catch {}
  }

  return {
    get data() { return data; },
    get status() { return status; },
    get error() { return error; },
    get saveError() { return saveError; },
    get cloudOk() { return cloudOk; },
    flushNow(): Promise<void> { return flushCloud(); },

    async load() {
      status = 'loading';
      let localRaw: unknown = null;
      try { localRaw = await local.load(); } catch { localRaw = null; }
      let raw: unknown = localRaw;
      if (cloud) {
        try {
          const cloudRaw = await cloud.load();
          if (cloudRaw) {
            const lv = (localRaw as any)?.meta?.updatedAt ?? '';
            const cv = (cloudRaw as any)?.meta?.updatedAt ?? '';
            if (!localRaw || cv > lv) raw = cloudRaw; // newest wins (ISO timestamps compare lexically)
          }
        } catch {
          if (!raw) {
            // Cloud unreachable AND nothing local: a flaky network must not look like a new
            // account — showing the setup wizard here would let the client overwrite live data.
            error = 'Не удалось получить данные из Telegram. Проверьте интернет и повторите.';
            status = 'error';
            return;
          }
          // Есть локальная копия — работаем с неё; облако догоним автоповтором (stale-guard
          // в хранилище не даст затереть более новые данные, если они там появились).
          cloudFails = 1;
          scheduleCloudRetry();
        }
      }
      try {
        const upgraded = raw != null && (raw as any)?.meta?.schemaVersion !== CURRENT_VERSION;
        data = migrate(raw);
        status = 'ready';
        // write back only when something actually changed: cloud won, or migration upgraded the shape
        if (raw !== localRaw || upgraded) {
          try { await local.save(data); } catch (e) { saveError = String(e); }
        }
      } catch (e) {
        error = e instanceof Error && e.message === 'newer-schema'
          ? 'Данные созданы более новой версией приложения. Обновите приложение и попробуйте снова.'
          : e instanceof Error && e.message === 'corrupt-data'
            ? 'Сохранённые данные повреждены и не могут быть прочитаны.'
            : String(e);
        status = 'error';
      }
    },
    setPlan(plan: Plan) { data.plan = plan; persist(); },
    async toggleTask(week: number, taskId: string) {
      const k = checkKey(week, taskId);
      data.progress.checks[k] = !data.progress.checks[k];
      await persist();
    },
    async saveKpi(week: number, goalId: string, value: number) {
      data.progress.kpis[kpiKey(week, goalId)] = value;
      await persist();
    },
    async setReflection(week: number, text: string) {
      data.progress.reflections[`${week}`] = text; await persist();
    },
    async setTheme(theme: ThemePref) { data.settings.theme = theme; await persist(); },
    async importData(d2: AppData) { stashBackup(); data = d2; await persist(); },
    async reset() { stashBackup(); data = migrate(null); await persist(); },

    // Завершение 12 недель → прошлый цикл в архив (виден в Профиле, синхронизируется
    // в облако и в резервные файлы), новый счёт недель с чистого листа.
    async startNewCycle(startDate: string, keepGoals: boolean) {
      if (!data.plan || !startDate) return;
      stashBackup();
      const snap = $state.snapshot(data) as AppData;
      if (!data.archive) data.archive = [];
      data.archive.push({ plan: snap.plan!, progress: snap.progress, archivedAt: now() });
      data.plan = {
        planId: genId('p'), planVersion: 1, clientId: snap.plan!.clientId, startDate,
        goals: keepGoals ? snap.plan!.goals : [],
        tactics: keepGoals ? snap.plan!.tactics : [],
        calendar: [],
      };
      data.progress = emptyProgress();
      await persist();
    },

    get backupAt() { return backupAt; },
    // Обмен местами: текущее состояние становится новой страховкой — «отмену» можно отменить.
    async restoreBackup(): Promise<boolean> {
      try {
        const b = JSON.parse(localStorage.getItem(BACKUP_KEY) ?? 'null');
        if (!b?.data) return false;
        const current = { when: now(), data: $state.snapshot(data) };
        data = migrate(b.data);
        localStorage.setItem(BACKUP_KEY, JSON.stringify(current));
        backupAt = current.when;
        await persist();
        return true;
      } catch { return false; }
    },

    // --- plan editing (goals & tactics stay editable after setup) ---
    async addGoal(): Promise<string | null> {
      if (!data.plan || data.plan.goals.length >= 3) return null; // метод: не больше трёх целей
      const palette: Goal['color'][] = ['red', 'blue', 'green', 'purple', 'amber', 'ink'];
      const g: Goal = { id: genId('g'), name: 'Новая цель', emoji: '🎯',
        color: palette[data.plan.goals.length % palette.length], metricName: '', metricTarget: 0 };
      data.plan.goals.push(g);
      await persist();
      return g.id;
    },
    async removeGoal(id: string) {
      if (!data.plan) return;
      const tacticIds = data.plan.tactics.filter(t => t.goalId === id).map(t => t.id);
      data.plan.goals = data.plan.goals.filter(g => g.id !== id);
      data.plan.tactics = data.plan.tactics.filter(t => t.goalId !== id);
      for (let w = 1; w <= WEEKS; w++) {
        for (const tid of tacticIds) delete data.progress.checks[checkKey(w, tid)];
        delete data.progress.kpis[kpiKey(w, id)];
      }
      await persist();
    },
    async updateGoal(id: string, patch: Partial<Pick<Goal, 'name' | 'metricName' | 'metricTarget' | 'emoji' | 'color'>>) {
      const g = data.plan?.goals.find(g => g.id === id); if (!g) return;
      Object.assign(g, patch);
      await persist();
    },
    async setTacticText(id: string, text: string) {
      const t = data.plan?.tactics.find(t => t.id === id); if (!t) return;
      t.text = text;
      await persist();
    },
    async addTacticTo(goalId: string, text: string) {
      if (!data.plan) return;
      data.plan.tactics.push({ id: genId('t'), goalId, text });
      await persist();
    },
    async removeTactic(id: string) {
      if (!data.plan) return;
      data.plan.tactics = data.plan.tactics.filter(t => t.id !== id);
      for (let w = 1; w <= WEEKS; w++) delete data.progress.checks[checkKey(w, id)]; // no orphan checks
      await persist();
    },

    async updateStartDate(startDate: string) {
      if (!data.plan || !startDate) return;
      data.plan.startDate = startDate;
      await persist();
    },

    // --- monthly report («Отчёт»: было/стало + здоровье роста, без денежного блока) ---
    async setMonthly(month: string, patch: Partial<MonthlyReport>) {
      if (!data.progress.monthly) data.progress.monthly = {};
      data.progress.monthly[month] = { ...data.progress.monthly[month], ...patch };
      await persist();
    },
    // Файл-обновление от консультанта: ДОБАВЛЯЕТ данные, не трогая отметки/рефлексии клиента.
    async applyUpdate(u: ConsultantUpdate) {
      if (u.monthly) {
        if (!data.progress.monthly) data.progress.monthly = {};
        for (const [m, rep] of Object.entries(u.monthly)) {
          data.progress.monthly[m] = { ...data.progress.monthly[m], ...rep };
        }
      }
      if (u.calendarAdd?.length && data.plan) {
        for (const e of u.calendarAdd) {
          data.plan.calendar.push({ status: 'planned', ...e, id: genId('c') });
        }
      }
      await persist();
    },

    // --- content calendar (client-editable) ---
    async addCalendarEntry(entry: Omit<CalendarEntry, 'id'>) {
      if (!data.plan) return;
      data.plan.calendar.push({ ...entry, id: genId('c') });
      await persist();
    },
    async updateCalendarEntry(id: string, patch: Partial<Omit<CalendarEntry, 'id'>>) {
      const e = data.plan?.calendar.find(e => e.id === id); if (!e) return;
      Object.assign(e, patch);
      await persist();
    },
    async removeCalendarEntry(id: string) {
      if (!data.plan) return;
      data.plan.calendar = data.plan.calendar.filter(e => e.id !== id);
      await persist();
    },
  };
}
export type Store = ReturnType<typeof createStore>;
