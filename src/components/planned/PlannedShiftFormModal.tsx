import { useState } from 'react';
import { addDays, combineDateTime, parseLocalDate, startOfDay, toDateInputValue } from '@/core/dateHelpers';
import { parseNumber } from '@/core/parseNumber';
import { roundedHoursFromRange } from '@/core/timeRounding';
import { surgeriesTotal } from '@/core/workEntry';
import { formatHours, formatMoney } from '@/format/intl';
import { appStore } from '@/store/appStoreSingleton';
import type { PlannedShift, Surgery } from '@/core/types';
import { Sheet } from '../ui/Sheet';
import { SurgeriesEditor } from '../surgeries/SurgeriesEditor';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface PlannedShiftFormModalProps {
  presetDate: number;
  shift?: PlannedShift;
  onClose: () => void;
}

/**
 * Порт AddEditPlannedShiftView без секции «Уведомление» (в web v1 нет push):
 * поля reminderEnabled/offset сохраняем нетронутыми для round-trip с iOS.
 */
export function PlannedShiftFormModal({ presetDate, shift, onClose }: PlannedShiftFormModalProps): React.JSX.Element {
  const settingsRate = appStore(s => s.settings.hourlyRate);
  const defaultSurgeryPrice = appStore(s => s.settings.surgeryPrice);
  const addPlannedShift = appStore(s => s.addPlannedShift);
  const updatePlannedShift = appStore(s => s.updatePlannedShift);
  const cancelShift = appStore(s => s.cancelShift);

  const [date, setDate] = useState(() => startOfDay(presetDate));
  const [startHm, setStartHm] = useState(() =>
    shift ? hm(shift.startTime) : '09:00'
  );
  const [endHm, setEndHm] = useState(() => (shift ? hm(shift.endTime) : '17:00'));
  const [rateText, setRateText] = useState(() =>
    shift ? formatRate(shift.rate) : formatRate(settingsRate)
  );
  const [note, setNote] = useState(() => shift?.note ?? '');
  const [surgeries, setSurgeries] = useState<Surgery[]>(() => shift?.surgeries.map(s => ({ ...s })) ?? []);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const startTime = combineDateTime(date, parseHm(startHm));
  const rawEnd = combineDateTime(date, parseHm(endHm));
  const endTime = rawEnd <= startTime ? addDays(rawEnd, 1) : rawEnd;

  const parsedRate = parseNumber(rateText) ?? settingsRate;
  const previewHours = roundedHoursFromRange(startTime, endTime);
  const previewPay = previewHours * parsedRate + surgeriesTotal(surgeries);
  const isValid = parsedRate > 0;

  const save = () => {
    if (!isValid) return;
    if (shift) {
      updatePlannedShift({
        ...shift,
        date,
        startTime,
        endTime,
        rate: parsedRate,
        note: note.trim() === '' ? null : note.trim(),
        surgeries
      });
    } else {
      addPlannedShift({
        id: crypto.randomUUID(),
        date,
        startTime,
        endTime,
        rate: parsedRate,
        reminderEnabled: true,
        reminderOffsetMinutes: 60,
        status: 'planned',
        actualStartTime: null,
        note: note.trim() === '' ? null : note.trim(),
        surgeries
      });
    }
    onClose();
  };

  return (
    <>
      <Sheet
        title={shift ? 'Плановая смена' : 'Новая смена'}
        onClose={onClose}
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-gray-100 px-4 py-3 font-medium active:bg-gray-200">
              Отмена
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!isValid}
              className="flex-1 rounded-xl bg-accent px-4 py-3 font-semibold text-white active:opacity-80 disabled:opacity-40"
            >
              Сохранить
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-gray-500">Дата</span>
              <input
                type="date"
                className="rounded-lg border border-gray-200 px-3 py-2.5"
                value={toDateInputValue(date)}
                onChange={e => {
                  const parsed = parseLocalDate(e.target.value);
                  if (parsed != null) setDate(parsed);
                }}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-500">Начало</span>
                <input type="time" className="rounded-lg border border-gray-200 px-3 py-2.5" value={startHm} onChange={e => setStartHm(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-500">Окончание</span>
                <input type="time" className="rounded-lg border border-gray-200 px-3 py-2.5" value={endHm} onChange={e => setEndHm(e.target.value)} />
              </label>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-gray-500">Ставка</span>
            <div className="flex items-center gap-2">
              <input
                inputMode="decimal"
                value={rateText}
                onChange={e => setRateText(e.target.value)}
                placeholder="Ставка в час"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5"
              />
              <span className="text-gray-500">₽/ч</span>
            </div>
          </label>

          <SurgeriesEditor surgeries={surgeries} defaultPrice={defaultSurgeryPrice} onChange={setSurgeries} />

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="flex justify-between">
              <span>Ожидается</span>
              <span className="text-gray-500">
                {formatHours(previewHours)} · {formatMoney(previewPay)}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Эта сумма не учитывается в зарплате, пока смена не будет закрыта.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-gray-500">Заметка</span>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Необязательно"
              rows={2}
              className="resize-none rounded-lg border border-gray-200 px-3 py-2.5"
            />
          </label>

          {shift ? (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="rounded-xl border border-danger/30 px-4 py-2.5 font-medium text-danger active:bg-red-50"
            >
              Отменить смену
            </button>
          ) : null}
        </div>
      </Sheet>

      {confirmingCancel ? (
        <ConfirmDialog
          title="Отменить эту смену?"
          confirmLabel="Отменить смену"
          onConfirm={() => {
            if (shift) cancelShift(shift.id);
            onClose();
          }}
          onCancel={() => setConfirmingCancel(false)}
        />
      ) : null}
    </>
  );
}

function hm(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function parseHm(value: string): { hours: number; minutes: number } {
  const [h = 0, m = 0] = value.split(':').map(Number) as [number, number];
  return { hours: Number.isNaN(h) ? 0 : h, minutes: Number.isNaN(m) ? 0 : m };
}

function formatRate(rate: number): string {
  return Number.isInteger(rate) ? String(rate) : String(rate);
}
