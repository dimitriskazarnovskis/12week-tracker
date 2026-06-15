let counter = 0;
let clock: () => string = () => new Date().toISOString();

function rand(): string {
  try {
    const a = new Uint32Array(2);
    (globalThis.crypto as Crypto).getRandomValues(a);
    return a[0].toString(36) + a[1].toString(36);
  } catch {
    return Math.floor(Math.random() * 1e9).toString(36);
  }
}
export function genId(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand()}`;
}
export function setClock(fn: () => string) { clock = fn; }
export function now(): string { return clock(); }
