import { Link } from 'react-router';
import { monthlySummaries } from '@/core/aggregator';
import { monthKeyId } from '@/core/monthKey';
import { formatEntriesCount, formatHours, formatMoney, formatMonthYear } from '@/format/intl';
import { appStore } from '@/store/appStoreSingleton';
import { HistoryIcon } from '@/components/ui/icons';

/** Порт HistoryView: месяцы сверху вниз, справа сумма и часы. */
export function HistoryPage(): React.JSX.Element {
  const entries = appStore(s => s.entries);
  const items = monthlySummaries(entries);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 pb-8 pt-4">
        <h1 className="self-start text-2xl font-bold">История</h1>
        <div className="flex flex-1 flex-col items-center gap-2 py-20 text-center">
          <HistoryIcon size={44} className="text-gray-300" />
          <p className="font-semibold">Пока нет записей</p>
          <p className="text-sm text-gray-400">Добавьте первую смену на вкладке «Календарь»</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-8 pt-4">
      <h1 className="text-2xl font-bold">История</h1>
      <div className="divide-y divide-gray-100 rounded-card bg-white px-4 shadow-sm">
        {items.map(item => (
          <Link
            key={monthKeyId(item.month)}
            to={`/history/${monthKeyId(item.month)}`}
            className="flex items-center gap-3 py-3 active:opacity-60"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[15px]">{formatMonthYear(item.month.year, item.month.month)}</p>
              <p className="text-xs text-gray-400">{formatEntriesCount(item.summary.entryCount)}</p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-semibold">{formatMoney(item.summary.totalPay)}</span>
              <span className="text-xs text-gray-400">{formatHours(item.summary.totalHours)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
