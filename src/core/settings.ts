import type { AppSettings } from './types';

/** Значения по умолчанию — как AppSettings.swift (ставка 400) + цена операции 1000. */
export const DEFAULT_SETTINGS: AppSettings = {
  hourlyRate: 400,
  surgeryPrice: 1000,
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
    surgeryPrice:
      typeof partial?.surgeryPrice === 'number' && isFinite(partial.surgeryPrice)
        ? partial.surgeryPrice
        : DEFAULT_SETTINGS.surgeryPrice,
    dailyReminderEnabled:
      typeof partial?.dailyReminderEnabled === 'boolean'
        ? partial.dailyReminderEnabled
        : DEFAULT_SETTINGS.dailyReminderEnabled
  };
}
