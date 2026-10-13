import { useState } from 'react';
import { availableMonths, monthlySummaries, summarizePeriod } from '@/core/aggregator';
import { addMonths, compareMonthKeys, currentMonthKey, monthKeyId } from '@/core/monthKey';
import { formatHours, formatMoney, formatMonthYear } from '@/format/intl';
import { appStore } from '@/store/appStoreSingleton';
import type { MonthKey } from '@/core/types';

/** Порт SummaryView: диапазон месяцев, пресеты, итог и разбивка по месяцам. */
export function SummaryPage(): React.JSX.Element {
  const entries = appStore(s => s.entries);
  const months = availableMonths(entries); // новые сверху

  const [range, setRange] = useState<{ from: MonthKey; to: MonthKey }>(() => ({
    // iOS onAppear: from = самый ранний месяц с записями, to = текущий
    from: months[months.length - 1] ?? currentMonthKey(),
    to: currentMonthKey()
  }));

  const now = currentMonthKey();
  const lower = compareMonthKeys(range.from, range.to) <= 0 ? range.from : range.to;
  const upper = compareMonthKeys(range.from, range.to) <= 0 ? range.to : range.from;

  const period = summarizePeriod(entries, range.from, range.to);
  const inRange = monthlySummaries(entries).filter(
    item => compareMonthKeys(item.month, lower) >= 0 && compareMonthKeys(item.month, upper) <= 0
  );

  const presets: { label: string; apply: () => void }[] = [
    { label: 'Этот месяц', apply: () => setRange({ from: now, to: now }) },
    { label: 'Последние 3 мес.', apply: () => setRange({ from: addMonths(now, -2), to: now }) },
    { label: 'Этот год', apply: () => setRange({ from: { year: now.year, month: 1 }, to: now }) },
    {
      label: 'Всё время',
      apply: () => {
        const earliest = months[months.length - 1];
        const latest = months[0];
        if (earliest && latest) setRange({ from: earliest, to: latest });
      }
    }
  ];

  const selectMonth = (which: 'from' | 'to') => (value: string) => {
    const key = months.find(m => monthKeyId(m) === value);
    if (key) setRange(r => ({ ...r, [which]: key }));
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-8 pt-4">
      <h1 className="text-2xl font-bold">Итоги</h1>

      <section className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-sm">
        <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400">Период</h2>
        <MonthSelect label="С месяца" months={months} value={range.from} onChange={selectMonth('from')} />
        <MonthSelect label="По месяц" months={months} value={range.to} onChange={selectMonth('to')} />
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={p.apply}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 active:bg-gray-100"
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-card bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Итог за период</h2>
        <div className="flex items-center justify-between">
          <span className="font-semibold">Заработано</span>
          <span className="text-2xl font-bold">{formatMoney(period.totalPay)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm text-gray-500">
          <span>Отработано часов</span>
          <span>{formatHours(period.totalHours)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm text-gray-500">
          <span>Записей</span>
          <span>{period.entryCount}</span>
        </div>
      </section>

      {inRange.length > 0 ? (
        <section className="rounded-card bg-white px-4 shadow-sm">
          <h2 className="pt-3 text-xs font-medium uppercase tracking-wide text-gray-400">По месяцам</h2>
          <div className="divide-y divide-gray-100 pb-1">
            {inRange.map(item => (
              <div key={monthKeyId(item.month)} className="flex items-center py-2.5">
                <span className="flex-1 text-[15px]">{formatMonthYear(item.month.year, item.month.month)}</span>
                <span className="text-sm text-gray-500">{formatMoney(item.summary.totalPay)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MonthSelect({
  label,
  months,
  value,
  onChange
}: {
  label: string;
  months: MonthKey[];
  value: MonthKey;
  onChange: (id: string) => void;
}): React.JSX.Element {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-500">{label}</span>
      <select
        value={monthKeyId(value)}
        onChange={e => onChange(e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-[15px]"
      >
        {/* значение вне списка (например, «Этот год» с январём без записей) — добавляем опцией */}
        {!months.some(m => monthKeyId(m) === monthKeyId(value)) ? (
          <option value={monthKeyId(value)}>{formatMonthYear(value.year, value.month)}</option>
        ) : null}
        {months.map(m => (
          <option key={monthKeyId(m)} value={monthKeyId(m)}>
            {formatMonthYear(m.year, m.month)}
          </option>
        ))}
      </select>
    </label>
  );
}
