import { estimatedPay } from '@/core/plannedShift';
import { formatMoney, formatTime } from '@/format/intl';
import type { PlannedShift } from '@/core/types';
import { ClockPlusIcon } from '../ui/icons';

/** Порт PlannedShiftRow: синее время начала–конца, заметка, справа «~X ₽». Строку про напоминание не рендерим (web v1). */
export function PlannedShiftRow({ shift }: { shift: PlannedShift }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[15px] text-info">
          <ClockPlusIcon size={16} />
          {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
        </p>
        {shift.note ? <p className="truncate text-xs text-gray-400">{shift.note}</p> : null}
      </div>
      <span className="text-sm text-gray-500">~{formatMoney(estimatedPay(shift))}</span>
    </div>
  );
}
