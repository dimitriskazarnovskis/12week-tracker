import type { StorageAdapter } from './adapter';
import { LocalStorageAdapter } from './local';
import { TelegramCloudAdapter } from './telegram';

export function localAdapter(): StorageAdapter { return new LocalStorageAdapter(); }
export function cloudAdapter(): StorageAdapter | null {
  return (globalThis as any)?.Telegram?.WebApp?.CloudStorage ? new TelegramCloudAdapter() : null;
}
