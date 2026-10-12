import { describe, it, expect } from 'vitest';
import { formatEntriesCount, formatFullDay, formatHours, formatMonthYear, formatMoney, formatTime } from '../intl';

const NBSP = ' ';

describe('Intl formaters (якорные строки паритета с iOS)', () => {
  it('деньги: разделители разрядов + ₽', () => {
    expect(formatMoney(12600)).toBe(`12${NBSP}600${NBSP}₽`);
    expect(formatMoney(2600.5)).toBe(`2${NBSP}600,5${NBSP}₽`);
    expect(formatMoney(400)).toBe(`400${NBSP}₽`);
  });

  it('часы: запятая-десятичная, максимум один знак', () => {
    expect(formatHours(6.5)).toBe(`6,5${NBSP}ч`);
    expect(formatHours(7)).toBe(`7${NBSP}ч`);
  });

  it('время 24-часовое', () => {
    expect(formatTime(new Date(2026, 9, 12, 9, 5).getTime())).toBe('09:05');
  });

  it('полная дата с заглавной буквы, день впереди (iOS d MMMM, EEEE)', () => {
    expect(formatFullDay(new Date(2026, 9, 12).getTime())).toBe(`12${NBSP}октября, понедельник`);
  });

  it('месяц+год с заглавной', () => {
    expect(formatMonthYear(2026, 10)).toBe(`Октябрь${NBSP}2026`);
  });

  it('плюрализация «запись/записи/записей»', () => {
    expect(formatEntriesCount(1)).toBe('1 запись');
    expect(formatEntriesCount(2)).toBe('2 записи');
    expect(formatEntriesCount(5)).toBe('5 записей');
    expect(formatEntriesCount(21)).toBe('21 запись');
    expect(formatEntriesCount(11)).toBe('11 записей');
  });
});
