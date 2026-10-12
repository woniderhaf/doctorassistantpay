import type { AppSettings } from './types';

/** Значения по умолчанию — как AppSettings.swift (ставка 400). */
export const DEFAULT_SETTINGS: AppSettings = {
  hourlyRate: 400,
  dailyReminderEnabled: true
};

/**
 * Подтягивает отсутствующие поля к дефолтам — аналог init(from decoder)
 * со decodeIfPresent в Swift: старые файлы без новых полей читаются.
 */
export function mergeSettings(partial: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    hourlyRate:
      typeof partial?.hourlyRate === 'number' && isFinite(partial.hourlyRate)
        ? partial.hourlyRate
        : DEFAULT_SETTINGS.hourlyRate,
    dailyReminderEnabled:
      typeof partial?.dailyReminderEnabled === 'boolean'
        ? partial.dailyReminderEnabled
        : DEFAULT_SETTINGS.dailyReminderEnabled
  };
}
