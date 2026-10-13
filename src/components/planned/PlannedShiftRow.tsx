import { estimatedPay } from '@/core/plannedShift';
import { surgeriesTotal } from '@/core/workEntry';
import { formatMoney, formatSurgeriesCount, formatTime } from '@/format/intl';
import type { PlannedShift } from '@/core/types';
import { ClockPlusIcon, SurgeryIcon } from '../ui/icons';

/** Порт PlannedShiftRow: синее время начала–конца, операции, заметка, справа «~X ₽». Напоминание не рендерим (web v1). */
export function PlannedShiftRow({ shift }: { shift: PlannedShift }): React.JSX.Element {
  const surgeriesAmount = surgeriesTotal(shift.surgeries);

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[15px] text-info">
          <ClockPlusIcon size={16} />
          {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
        </p>
        {shift.surgeries.length > 0 ? (
          <p className="flex items-center gap-1 truncate text-xs text-gray-400">
            <SurgeryIcon size={12} />
            {shift.surgeries.length === 1
              ? shift.surgeries[0]!.name || 'операция'
              : formatSurgeriesCount(shift.surgeries.length)}
            {surgeriesAmount > 0 ? ` · +${formatMoney(surgeriesAmount)}` : ''}
          </p>
        ) : null}
        {shift.note ? <p className="truncate text-xs text-gray-400">{shift.note}</p> : null}
      </div>
      <span className="text-sm text-gray-500">~{formatMoney(estimatedPay(shift))}</span>
    </div>
  );
}
