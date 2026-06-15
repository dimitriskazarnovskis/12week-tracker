import type { StorageAdapter } from './adapter';
import { LocalStorageAdapter } from './local';
import { TelegramCloudAdapter } from './telegram';

export function localAdapter(): StorageAdapter { return new LocalStorageAdapter(); }
export function cloudAdapter(): StorageAdapter | null {
  const wa = (globalThis as any)?.Telegram?.WebApp;
  // CloudStorage requires Bot API 6.9+. Old clients / the browser SDK stub expose
  // the object but throw "not supported" and never call back — guard against that.
  const ok = wa?.CloudStorage && (typeof wa.isVersionAtLeast !== 'function' || wa.isVersionAtLeast('6.9'));
  return ok ? new TelegramCloudAdapter() : null;
}
