import { roundedHours, finalPay, isPayOverridden } from '@/core/workEntry';
import { formatHours, formatMoney, formatTime } from '@/format/intl';
import type { WorkEntry } from '@/core/types';
import { PencilIcon } from '../ui/icons';

/** Порт EntryRow: «HH:mm–HH:mm» или «N ч»/«N ч M мин», часы + сумма, карандаш при ручной правке. */
export function EntryRow({ entry }: { entry: WorkEntry }): React.JSX.Element {
  const timeDescription =
    entry.inputMode.kind === 'timeRange'
      ? `${formatTime(entry.inputMode.start)}–${formatTime(entry.inputMode.end)}`
      : entry.inputMode.minutes === 0
        ? `${entry.inputMode.hours} ч`
        : `${entry.inputMode.hours} ч ${entry.inputMode.minutes} мин`;

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px]">{timeDescription}</p>
        {entry.note ? <p className="truncate text-xs text-gray-400">{entry.note}</p> : null}
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[15px]">{formatHours(roundedHours(entry))}</span>
        <span className="flex items-center gap-1 text-sm font-semibold">
          {isPayOverridden(entry) ? <PencilIcon size={13} className="text-warning" /> : null}
          {formatMoney(finalPay(entry))}
        </span>
      </div>
    </div>
  );
}
