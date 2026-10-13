import { useMemo, useState } from 'react';
import { summarize } from '@/core/aggregator';
import { isSameDay, startOfDay, todayStart } from '@/core/dateHelpers';
import { formatFullDay, formatHours, formatMoney } from '@/format/intl';
import { appStore } from '@/store/appStoreSingleton';
import { useLocalDateParam } from '@/hooks/useLocalDateParam';
import { useModalParam } from '@/hooks/useModalParam';
import { useNow } from '@/hooks/useNow';
import { MonthCalendarGrid } from '@/components/calendar/MonthCalendarGrid';
import { ShiftStatusBanner } from '@/components/calendar/ShiftStatusBanner';
import { EntryRow } from '@/components/entries/EntryRow';
import { EntryFormModal } from '@/components/entries/EntryFormModal';
import { PlannedShiftRow } from '@/components/planned/PlannedShiftRow';
import { PlannedShiftFormModal } from '@/components/planned/PlannedShiftFormModal';
import { CalendarPlusIcon, CheckCircleIcon, PlusIcon } from '@/components/ui/icons';

/** Порт CalendarView: плашка → сетка → «Запланировано» → секция дня; «+» меню. */
export function CalendarPage(): React.JSX.Element {
  const now = useNow();
  const { date, setDate } = useLocalDateParam(todayStart());
  const entryModal = useModalParam('entry');
  const shiftModal = useModalParam('shift');

  const entries = appStore(s => s.entries);
  const plannedShifts = appStore(s => s.plannedShifts);

  const [menuOpen, setMenuOpen] = useState(false);

  const dayEntries = useMemo(() => entries.filter(e => isSameDay(e.date, date)), [entries, date]);
  const dayPlannedShifts = useMemo(
    () => plannedShifts.filter(s => s.status === 'planned' && isSameDay(s.date, date)),
    [plannedShifts, date]
  );
  const daySummary = summarize(dayEntries);

  const datesWithEntries = useMemo(() => new Set(entries.map(e => startOfDay(e.date))), [entries]);
  const datesWithPlannedShifts = useMemo(
    () => new Set(plannedShifts.filter(s => s.status === 'planned').map(s => startOfDay(s.date))),
    [plannedShifts]
  );

  const editingEntry = entryModal.value && entryModal.value !== 'new'
    ? entries.find(e => e.id === entryModal.value)
    : undefined;
  const editingShift = shiftModal.value && shiftModal.value !== 'new'
    ? plannedShifts.find(s => s.id === shiftModal.value)
    : undefined;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-8 pt-4">
      <h1 className="text-2xl font-bold">Учёт смен</h1>

      <ShiftStatusBanner now={now} />

      <MonthCalendarGrid
        selectedDate={date}
        onSelect={setDate}
        hasEntries={dayMs => datesWithEntries.has(dayMs)}
        hasPlannedShift={dayMs => datesWithPlannedShifts.has(dayMs)}
      />

      {dayPlannedShifts.length > 0 ? (
        <section className="rounded-card bg-white px-4 shadow-sm">
          <h2 className="pt-3 text-xs font-medium uppercase tracking-wide text-gray-400">Запланировано</h2>
          <div className="divide-y divide-gray-100 pb-1">
            {dayPlannedShifts.map(shift => (
              <button
                key={shift.id}
                type="button"
                onClick={() => shiftModal.open(shift.id)}
                className="w-full text-left active:opacity-60"
              >
                <PlannedShiftRow shift={shift} />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-card bg-white px-4 shadow-sm">
        <h2 className="pt-3 text-xs font-medium uppercase tracking-wide text-gray-400">{formatFullDay(date)}</h2>
        {dayEntries.length === 0 ? (
          <p className="py-4 text-[15px] text-gray-400">Нет записей за этот день</p>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {dayEntries.map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => entryModal.open(entry.id)}
                  className="w-full text-left active:opacity-60"
                >
                  <EntryRow entry={entry} />
                </button>
              ))}
            </div>
            <p className="pb-3 pt-2 text-xs text-gray-400">
              Итого за день: {formatHours(daySummary.totalHours)} · {formatMoney(daySummary.totalPay)}
            </p>
          </>
        )}
      </section>

      {/* «+» меню — аналог toolbar Menu в iOS */}
      <div className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-4 z-40 lg:bottom-8 lg:right-8">
        {menuOpen ? (
          <>
            <div className="fixed inset-0 -z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute bottom-16 right-0 w-64 rounded-card bg-white p-1.5 shadow-lg ring-1 ring-gray-100">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  entryModal.open('new');
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] active:bg-gray-100"
              >
                <CheckCircleIcon className="text-success" /> Отработанная смена
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  shiftModal.open('new');
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] active:bg-gray-100"
              >
                <CalendarPlusIcon className="text-info" /> Запланировать смену
              </button>
            </div>
          </>
        ) : null}
        <button
          type="button"
          aria-label="Добавить"
          onClick={() => setMenuOpen(v => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg active:scale-95"
        >
          <PlusIcon size={26} />
        </button>
      </div>

      {entryModal.value ? (
        <EntryFormModal presetDate={date} entry={editingEntry} onClose={entryModal.close} />
      ) : null}

      {shiftModal.value ? (
        <PlannedShiftFormModal presetDate={date} shift={editingShift} onClose={shiftModal.close} />
      ) : null}
    </div>
  );
}
