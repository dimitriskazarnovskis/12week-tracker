import type { StorageAdapter } from './adapter';
import type { AppData } from '../types';
const KEY = 'kazdash';

export class LocalStorageAdapter implements StorageAdapter {
  async load(): Promise<unknown | null> {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }
  async save(data: AppData): Promise<void> {
    // no swallow: quota / private-mode failures must reach the store so the UI can warn
    localStorage.setItem(KEY, JSON.stringify(data));
  }
}
