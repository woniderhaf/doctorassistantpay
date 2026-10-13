import { useState } from 'react';
import { addMonths, monthStart } from '@/core/monthKey';
import { formatMonthYear } from '@/format/intl';
import { isSameDay, monthKeyOf, startOfDay, toDateInputValue } from '@/core/dateHelpers';
import type { MonthKey } from '@/core/types';
import { ChevronLeftIcon, ChevronRightIcon } from '../ui/icons';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface MonthCalendarGridProps {
  selectedDate: number;
  onSelect: (dayMs: number) => void;
  hasEntries: (dayMs: number) => boolean;
  hasPlannedShift: (dayMs: number) => boolean;
}

/**
 * Порт MonthCalendarView: неделя с Пн, зелёная цифра дня с записями,
 * синяя точка плановой смены, кольцо «сегодня», залитый круг выбранного дня.
 */
export function MonthCalendarGrid({ selectedDate, onSelect, hasEntries, hasPlannedShift }: MonthCalendarGridProps): React.JSX.Element {
  // syncFrom помечает, от какого selectedDate уже синхронизировались: перелистывание
  // стрелками само по себе не должно откатываться (в iOS это onChange(selectedDate),
  // а не «на каждом рендере»).
  const [view, setView] = useState(() => ({ month: monthKeyOf(selectedDate), syncFrom: selectedDate }));
  if (view.syncFrom !== selectedDate) {
    setView({ month: monthKeyOf(selectedDate), syncFrom: selectedDate });
  }
  const displayed = view.month;
  const setDisplayed = (next: MonthKey | ((prev: MonthKey) => MonthKey)) =>
    setView(v => ({ month: typeof next === 'function' ? next(v.month) : next, syncFrom: selectedDate }));

  const firstOfMonth = monthStart(displayed);
  const daysInMonth = new Date(displayed.year, displayed.month, 0).getDate();
  // leading blanks: (weekdayOfFirst - firstWeekdayMon + 7) % 7; JS getDay(): Sun=0
  const weekdayOfFirst = (new Date(firstOfMonth).getDay() + 6) % 7;

  const today = startOfDay(Date.now());

  const shiftMonth = (delta: number) => setDisplayed(m => addMonths(m, delta));

  return (
    <div className="rounded-card bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Предыдущий месяц" onClick={() => shiftMonth(-1)} className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100">
          <ChevronLeftIcon />
        </button>
        <span className="font-semibold">{formatMonthYear(displayed.year, displayed.month)}</span>
        <button type="button" aria-label="Следующий месяц" onClick={() => shiftMonth(1)} className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100">
          <ChevronRightIcon />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-xs text-gray-400">
        {WEEKDAYS.map(w => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-y-1.5">
        {Array.from({ length: weekdayOfFirst }, (_, i) => (
          <span key={`blank-${i}`} className="h-[42px]" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = new Date(displayed.year, displayed.month - 1, i + 1);
          day.setHours(0, 0, 0, 0);
          const ms = day.getTime();
          const isSelected = isSameDay(ms, selectedDate);
          const isToday = ms === today;
          const dayHasEntries = hasEntries(ms);
          const dayHasPlanned = hasPlannedShift(ms);
          return (
            <button
              key={toDateInputValue(ms)}
              type="button"
              onClick={() => onSelect(ms)}
              className="mx-auto flex h-[42px] w-full flex-col items-center justify-start"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] ${
                  isSelected
                    ? 'bg-accent font-medium text-white'
                    : dayHasEntries
                      ? 'font-medium text-success'
                      : 'text-gray-900'
                } ${isToday && !isSelected ? 'ring-1 ring-accent' : ''}`}
              >
                {i + 1}
              </span>
              <span className="mt-0.5 flex h-1 items-center gap-[3px]">
                {isSelected && dayHasEntries ? <span className="h-1 w-1 rounded-full bg-success" /> : null}
                {dayHasPlanned ? <span className="h-1 w-1 rounded-full bg-info" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 text-right">
        <button type="button" onClick={() => onSelect(today)} className="px-2 py-1 text-sm text-accent">
          Сегодня
        </button>
      </div>
    </div>
  );
}
