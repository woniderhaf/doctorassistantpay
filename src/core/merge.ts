import type { PlannedShift, WorkEntry } from './types';

/**
 * Слияние импортированных данных с уже хранящимися.
 *
 * Ключ — `id`: повторный импорт того же файла не создаёт дублей. При коллизии
 * побеждает файл (свежий снимок источника), об этом говорим и в интерфейсе.
 */
export interface MergeResult<T> {
  items: T[];
  added: number;
  updated: number;
  unchanged: number;
}

export function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): MergeResult<T> {
  const byId = new Map(existing.map(item => [item.id, item] as const));
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const item of incoming) {
    const previous = byId.get(item.id);
    if (previous === undefined) {
      added += 1;
    } else if (JSON.stringify(previous) === JSON.stringify(item)) {
      unchanged += 1;
      continue;
    } else {
      updated += 1;
    }
    byId.set(item.id, item);
  }

  return { items: [...byId.values()], added, updated, unchanged };
}

/** Неизменяемые смены проще всего сравнивать через JSON — порядок ключей у нас стабилен. */
export function mergeEntries(existing: WorkEntry[], incoming: WorkEntry[]): MergeResult<WorkEntry> {
  return mergeById(existing, incoming);
}

export function mergePlannedShifts(existing: PlannedShift[], incoming: PlannedShift[]): MergeResult<PlannedShift> {
  return mergeById(existing, incoming);
}

/** Человекочитаемое итог-сообщение импорта. */
export function describeMerge(label: string, result: MergeResult<unknown>): string {
  const parts: string[] = [];
  if (result.added > 0) parts.push(`добавлено ${result.added}`);
  if (result.updated > 0) parts.push(`обновлено ${result.updated}`);
  if (parts.length === 0) parts.push('без изменений');
  return `${label}: ${parts.join(', ')}`;
}
