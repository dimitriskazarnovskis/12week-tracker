import type { AppData } from '../types';
export interface StorageAdapter {
  load(): Promise<unknown | null>;
  save(data: AppData): Promise<void>;
}
