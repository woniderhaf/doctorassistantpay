import { createAppStore } from './appStore';
import { IdbRepository } from './repository';

/**
 * Глобальный стор приложения (данные хранит этот единственный экземпляр).
 * Тесты создают свои через createAppStore(MemoryRepository).
 */
export const appStore = createAppStore(new IdbRepository());
