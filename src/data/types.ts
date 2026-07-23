export type ID = string;
export type GoalColorId = 'red' | 'ink' | 'green' | 'blue' | 'purple' | 'amber';
export type ContentType = 'reel' | 'carousel' | 'story' | 'post';
export type EntryStatus = 'planned' | 'ready' | 'published';
export type ThemePref = 'auto' | 'light' | 'dark';

export const WEEKS = 12;
export const APP_VERSION = '1.4.6';
export const GOAL_COLORS: Record<GoalColorId, { hex: string; on: string }> = {
  red:    { hex: '#D12329', on: '#FCEAEC' },
  ink:    { hex: '#231F20', on: '#F0EFEE' },
  green:  { hex: '#2E8B57', on: '#E6F4EC' },
  blue:   { hex: '#2E5E8E', on: '#E3EDF7' },
  purple: { hex: '#6B2D8E', on: '#F3E5F5' },
  amber:  { hex: '#C8860B', on: '#FFF4DD' },
};
export const EMOJIS = ['🎯','📈','💰','📱','🚀','🔥','💪','📊','✍️','🏆','❤️','🧠'];

export interface Goal { id: ID; name: string; emoji: string; color: GoalColorId; metricName: string; metricTarget: number; }
export interface Tactic { id: ID; goalId: ID; text: string; }
export interface CalendarEntry { id: ID; date: string; type: ContentType; title: string; status: EntryStatus; }
export interface Vision { y3?: string; y5?: string; y10?: string; }

export interface Plan {
  planId: ID; planVersion: number; clientId: string; startDate: string;
  goals: Goal[]; tactics: Tactic[]; calendar: CalendarEntry[]; vision?: Vision;
}
// Месячный отчёт (вкладка «Отчёт», зеркало Ergebnis-Dashboard без денежного блока).
// Ключ — 'YYYY-MM' или 'start' (точка А до начала программы).
export interface MonthlyReport {
  followers?: number; views?: number; reach?: number;
  likes?: number; comments?: number; saves?: number; // saves = сохранения + пересылки
  profileVisits?: number; inquiries?: number; consults?: number; clients?: number;
}
export interface Progress {
  checks: Record<string, boolean>;
  kpis: Record<string, number>;
  reflections: Record<string, string>;
  monthly?: Record<string, MonthlyReport>;
}
export interface Settings { theme: ThemePref; lang: 'ru'; }
export interface Meta { schemaVersion: number; createdAt: string; updatedAt: string; }
export interface AppData { meta: Meta; plan: Plan | null; progress: Progress; settings: Settings; }

export function emptyProgress(): Progress { return { checks: {}, kpis: {}, reflections: {}, monthly: {} }; }
export const checkKey = (week: number, taskId: ID) => `${week}:${taskId}`;
export const kpiKey = (week: number, goalId: ID) => `${week}:${goalId}`;
