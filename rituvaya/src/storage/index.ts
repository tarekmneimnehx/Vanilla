import { Platform } from 'react-native';
import type { Repository } from './repository';
import { MemoryRepository } from './memoryRepository';

const WEB_STORAGE_KEY = 'rituvaya.data.v1';

/**
 * Native platforms use SQLite. The web preview (used for design checks) keeps
 * the same data shape in localStorage so screens can be exercised end to end.
 */
export function createRepository(): Repository {
  if (Platform.OS === 'web') {
    return new MemoryRepository({
      load: () => {
        try {
          return globalThis.localStorage?.getItem(WEB_STORAGE_KEY) ?? null;
        } catch {
          return null;
        }
      },
      save: (json) => {
        try {
          globalThis.localStorage?.setItem(WEB_STORAGE_KEY, json);
        } catch {
          // storage unavailable (private mode); keep running in memory
        }
      },
    });
  }
  // Required lazily so the web bundle never touches the native module.
  const { SqliteRepository } = require('./sqliteRepository') as typeof import('./sqliteRepository');
  return new SqliteRepository();
}

export function storageEngineName(repo: Repository): string {
  return repo.kind === 'sqlite' ? 'SQLite' : 'Browser storage (preview)';
}
