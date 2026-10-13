import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { entriesInMonth, groupByDay, summarize } from '@/core/aggregator';
import { parseMonthKey } from '@/core/monthKey';
import { finalPay, roundedHours } from '@/core/workEntry';
import { formatHours, formatMoney, formatMonthYear, formatShortDay, formatSurgeriesCount } from '@/format/intl';
import { appStore } from '@/store/appStoreSingleton';
import { useModalParam } from '@/hooks/useModalParam';
import { EntryFormModal } from '@/components/entries/EntryFormModal';
import { ChevronLeftIcon, SurgeryIcon } from '@/components/ui/icons';
import type { WorkEntry } from '@/core/types';

/** Порт MonthDetailView: карточка итога месяца + записи по дням (новые сверху). */
export function MonthDetailPage(): React.JSX.Element {
  const { month: raw } = useParams();
  const month = raw ? parseMonthKey(raw) : null;
  const entries = appStore(s => s.entries);
  const entryModal = useModalParam('entry');

  const monthEntries = useMemo(
    () => (month ? entriesInMonth(entries, month) : []),
    [entries, month]
  );

  if (!month) return <Navigate to="/history" replace />;

  const summary = summarize(monthEntries);
  const days = [...groupByDay(monthEntries).entries()].sort((a, b) => b[0] - a[0]);

  const editingEntry = entryModal.value
    ? entries.find(e => e.id === entryModal.value)
    : undefined;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-8 pt-4">
      <div className="flex items-center gap-1">
        <Link to="/history" className="-ml-2 rounded-full p-2 text-accent active:bg-gray-100">
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-xl font-bold">{formatMonthYear(month.year, month.month)}</h1>
      </div>

      <div className="rounded-card bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Итого за месяц</span>
          <span className="text-xl font-bold">{formatMoney(summary.totalPay)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm text-gray-500">
          <span>Отработано часов</span>
          <span>{formatHours(summary.totalHours)}</span>
        </div>
      </div>

      {days.map(([day, dayEntries]) => (
        <section key={day} className="rounded-card bg-white px-4 shadow-sm">
          <h2 className="pt-3 text-xs font-medium uppercase tracking-wide text-gray-400">{formatShortDay(day)}</h2>
          <div className="divide-y divide-gray-100 pb-1">
            {dayEntries.map(entry => (
              <button
                key={entry.id}
                type="button"
                onClick={() => entryModal.open(entry.id)}
                className="w-full text-left active:opacity-60"
              >
                <MonthEntryRow entry={entry} />
              </button>
            ))}
          </div>
        </section>
      ))}

      {entryModal.value && editingEntry ? (
        <EntryFormModal presetDate={editingEntry.date} entry={editingEntry} onClose={entryModal.close} />
      ) : null}
    </div>
  );
}

/** Строка как в MonthDetailView: часы · заметка … сумма (компактнее EntryRow). */
function MonthEntryRow({ entry }: { entry: WorkEntry }): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 py-2.5">
      <span className="text-[15px]">{formatHours(roundedHours(entry))}</span>
      {entry.surgeries.length > 0 ? (
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <SurgeryIcon size={12} />
          {entry.surgeries.length === 1 ? entry.surgeries[0]!.name || 'операция' : formatSurgeriesCount(entry.surgeries.length)}
        </span>
      ) : null}
      {entry.note ? <span className="min-w-0 flex-1 truncate text-xs text-gray-400">· {entry.note}</span> : <span className="flex-1" />}
      <span className="text-sm font-semibold">{formatMoney(finalPay(entry))}</span>
    </div>
  );
}
