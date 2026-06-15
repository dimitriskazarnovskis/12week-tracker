let counter = 0;
let clock: () => string = () => new Date().toISOString();

export function genId(prefix = 'id'): string {
  counter += 1;
  const rand = Math.floor(performance.now() % 1e6).toString(36);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}
export function setClock(fn: () => string) { clock = fn; }
export function now(): string { return clock(); }
