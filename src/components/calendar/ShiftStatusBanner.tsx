import { useState } from 'react';
import { appStore } from '@/store/appStoreSingleton';
import { isDue } from '@/core/plannedShift';
import { formatTime } from '@/format/intl';
import type { PlannedShift } from '@/core/types';
import { CheckIcon, ClockIcon, PlayIcon, QuestionIcon } from '../ui/icons';
import { ConfirmDialog } from '../ui/ConfirmDialog';

/** Порт ShiftStatusBanner: активная (зелёная) либо «смена началась?» (оранжевая). */
export function ShiftStatusBanner({ now }: { now: number }): React.JSX.Element | null {
  const activeShift = appStore(s => s.plannedShifts.find(sh => sh.status === 'active'));
  const dueShift = appStore(s => {
    const due = s.plannedShifts.filter(sh => isDue(sh, now));
    return due.length ? due.reduce((min, sh) => (sh.startTime < min.startTime ? sh : min)) : undefined;
  });
  const [pendingCancel, setPendingCancel] = useState<PlannedShift | null>(null);

  const closeShift = appStore(s => s.closeShift);
  const activateShift = appStore(s => s.activateShift);
  const cancelShift = appStore(s => s.cancelShift);

  const shift = activeShift ?? dueShift;
  if (!shift) return null;

  return (
    <>
      <div className={`rounded-card p-4 ${activeShift ? 'bg-success/10' : 'bg-warning/10'}`}>
        <div className={`flex items-center gap-2 font-semibold ${activeShift ? 'text-success' : 'text-warning'}`}>
          {activeShift ? <ClockIcon size={18} /> : <QuestionIcon size={18} />}
          {activeShift ? 'Активная смена' : 'Смена началась?'}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {activeShift
            ? `Началась в ${formatTime(activeShift.actualStartTime ?? activeShift.startTime)}`
            : `По плану: ${formatTime(shift.startTime)}–${formatTime(shift.endTime)}`}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {activeShift ? (
            <button
              type="button"
              onClick={() => closeShift(activeShift.id, Date.now())}
              className="flex items-center justify-center gap-2 rounded-xl bg-success px-4 py-2.5 font-semibold text-white active:opacity-80"
            >
              <CheckIcon size={18} /> Завершить смену
            </button>
          ) : (
            <button
              type="button"
              onClick={() => activateShift(dueShift!.id, Date.now())}
              className="flex items-center justify-center gap-2 rounded-xl bg-warning px-4 py-2.5 font-semibold text-white active:opacity-80"
            >
              <PlayIcon size={18} /> Да, началась
            </button>
          )}
          <button
            type="button"
            onClick={() => setPendingCancel(shift)}
            className="rounded-xl border border-gray-200 px-4 py-2.5 font-medium text-danger active:bg-gray-50"
          >
            Отменить смену
          </button>
        </div>
      </div>

      {pendingCancel ? (
        <ConfirmDialog
          title="Отменить эту смену?"
          confirmLabel="Отменить смену"
          onConfirm={() => {
            cancelShift(pendingCancel.id);
            setPendingCancel(null);
          }}
          onCancel={() => setPendingCancel(null)}
        />
      ) : null}
    </>
  );
}
