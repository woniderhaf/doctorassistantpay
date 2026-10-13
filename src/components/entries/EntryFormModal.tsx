import { useMemo, useState } from 'react';
import { roundedHoursFromMinutes } from '@/core/timeRounding';
import { surgeriesTotal } from '@/core/workEntry';
import { parseNumber } from '@/core/parseNumber';
import { addDays, combineDateTime, parseLocalDate, startOfDay, toDateInputValue } from '@/core/dateHelpers';
import { formatHours, formatMoney } from '@/format/intl';
import { appStore } from '@/store/appStoreSingleton';
import type { Surgery, WorkEntry } from '@/core/types';
import { Sheet } from '../ui/Sheet';
import { SurgeriesEditor } from '../surgeries/SurgeriesEditor';
import { SegmentedControl } from '../ui/SegmentedControl';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TrashIcon } from '../ui/icons';

interface EntryFormModalProps {
  presetDate: number;
  /** Передана — редактирование, иначе новая запись. */
  entry?: WorkEntry;
  onClose: () => void;
}

type InputChoice = 'timeRange' | 'duration';

function formatRateValue(rate: number): string {
  return Number.isInteger(rate) ? String(rate) : String(rate);
}

/** Порт AddEditEntryView: форма создания/редактирования записи. */
export function EntryFormModal({ presetDate, entry, onClose }: EntryFormModalProps): React.JSX.Element | null {
  const settingsRate = appStore(s => s.settings.hourlyRate);
  const defaultSurgeryPrice = appStore(s => s.settings.surgeryPrice);
  const addEntry = appStore(s => s.addEntry);
  const updateEntry = appStore(s => s.updateEntry);
  const deleteEntry = appStore(s => s.deleteEntry);
  const setHourlyRate = appStore(s => s.setHourlyRate);

  const [date, setDate] = useState(() => (entry ? entry.date : startOfDay(presetDate)));
  const [choice, setChoice] = useState<InputChoice>(() => entry?.inputMode.kind ?? 'timeRange');
  const [startTime, setStartTime] = useState(() => {
    if (entry?.inputMode.kind === 'timeRange') return new Date(entry.inputMode.start);
    if (entry) return new Date(); // при редактировании duration-записи — как Date() в iOS
    return timeOn(new Date(), 9, 0); // новая запись — 9:00
  });
  const [endTime, setEndTime] = useState(() => {
    if (entry?.inputMode.kind === 'timeRange') return new Date(entry.inputMode.end);
    if (entry) return new Date();
    return timeOn(new Date(), 17, 0); // новая запись — 17:00
  });
  const [durationHours, setDurationHours] = useState(() =>
    entry?.inputMode.kind === 'duration' ? entry.inputMode.hours : 8
  );
  const [durationMinutes, setDurationMinutes] = useState(() =>
    entry?.inputMode.kind === 'duration' ? entry.inputMode.minutes : 0
  );
  // при создании новой записи ставка подставляется из настроек (как onAppear в iOS)
  const [rateText, setRateText] = useState(() =>
    entry ? formatRateValue(entry.rate) : formatRateValue(settingsRate)
  );
  const [useManualPay, setUseManualPay] = useState(() => entry?.overridePay != null);
  const [manualPayText, setManualPayText] = useState(() =>
    entry?.overridePay != null ? formatRateValue(entry.overridePay) : ''
  );
  const [note, setNote] = useState(() => entry?.note ?? '');
  const [surgeries, setSurgeries] = useState<Surgery[]>(() => entry?.surgeries.map(s => ({ ...s })) ?? []);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const parsedStartTime = parseTimeInput(startTime);
  const parsedEndTime = parseTimeInput(endTime);

  // правило iOS: end <= start ⇒ конец переносится на следующий день
  const effectiveEnd = useMemo(() => {
    const dayStart = combineDateTime(date, parsedStartTime);
    const dayEnd = combineDateTime(date, parsedEndTime);
    return dayEnd <= dayStart ? addDays(dayEnd, 1) : dayEnd;
  }, [date, parsedStartTime, parsedEndTime]);

  const previewRawMinutes = useMemo(() => {
    if (choice === 'timeRange') {
      const dayStart = combineDateTime(date, parsedStartTime);
      return Math.max((effectiveEnd - dayStart) / 60_000, 0);
    }
    return durationHours * 60 + durationMinutes;
  }, [choice, date, parsedStartTime, effectiveEnd, durationHours, durationMinutes]);

  const roundedPreview = roundedHoursFromMinutes(previewRawMinutes);
  const parsedRate = parseNumber(rateText) ?? settingsRate; // фолбэк на настройку, как в iOS
  const parsedManualPay = useManualPay ? parseNumber(manualPayText) : null;
  const surgeriesPreview = surgeriesTotal(surgeries);
  const computedPreview = roundedPreview * parsedRate + surgeriesPreview;
  const finalPreview = parsedManualPay ?? computedPreview;

  const isValid =
    (choice !== 'timeRange' || previewRawMinutes > 0) &&
    (choice !== 'duration' || durationHours > 0 || durationMinutes > 0) &&
    parsedRate > 0 &&
    (!useManualPay || parsedManualPay !== null);

  const buildEntry = (): WorkEntry => {
    const inputMode =
      choice === 'timeRange'
        ? ({ kind: 'timeRange', start: combineDateTime(date, parsedStartTime), end: effectiveEnd } as const)
        : ({ kind: 'duration', hours: durationHours, minutes: durationMinutes } as const);
    return {
      id: entry?.id ?? crypto.randomUUID(),
      date,
      inputMode,
      rate: parsedRate,
      overridePay: parsedManualPay,
      note: note.trim() === '' ? null : note.trim(),
      surgeries
    };
  };

  const save = () => {
    if (!isValid) return;
    const built = buildEntry();
    if (entry) {
      updateEntry(built);
    } else {
      addEntry(built);
      // запоминаем ставку как новую по умолчанию (iOS-поведение)
      if (parsedRate !== settingsRate) setHourlyRate(parsedRate);
    }
    onClose();
  };

  const remove = () => {
    if (entry) deleteEntry(entry.id);
    onClose();
  };

  return (
    <>
      <Sheet
        title={entry ? 'Редактирование' : 'Новая запись'}
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

          <div className="flex flex-col gap-3">
            <span className="text-sm text-gray-500">Как ввести время</span>
            <SegmentedControl
              options={[
                { value: 'timeRange', label: 'Время начала/конца' },
                { value: 'duration', label: 'Продолжительность' }
              ]}
              value={choice}
              onChange={setChoice}
            />
            {choice === 'timeRange' ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-gray-500">Начало</span>
                  <input
                    type="time"
                    className="rounded-lg border border-gray-200 px-3 py-2.5"
                    value={toTimeInputValue(startTime, '09:00')}
                    onChange={e => setStartTime(parseTimeValue(e.target.value, '09:00'))}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-gray-500">Окончание</span>
                  <input
                    type="time"
                    className="rounded-lg border border-gray-200 px-3 py-2.5"
                    value={toTimeInputValue(endTime, '17:00')}
                    onChange={e => setEndTime(parseTimeValue(e.target.value, '17:00'))}
                  />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StepperField label="Часы" value={durationHours} min={0} max={23} step={1} onChange={setDurationHours} />
                <StepperField label="Минуты" value={durationMinutes} min={0} max={55} step={5} onChange={setDurationMinutes} />
              </div>
            )}
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="flex justify-between">
              <span>Отработано (округлено)</span>
              <span className="text-gray-500">{formatHours(roundedPreview)}</span>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Смена округляется до ближайшего получаса. Например, 6 ч 40 мин → 6,5 ч, а 6 ч 50 мин → 7 ч.
            </p>
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

          <div className="flex flex-col gap-3 rounded-xl bg-gray-50 p-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-[15px]">Изменить итоговую сумму вручную</span>
              <ToggleSwitch checked={useManualPay} onChange={setUseManualPay} />
            </label>
            {useManualPay ? (
              <div className="flex items-center gap-2">
                <input
                  inputMode="decimal"
                  value={manualPayText}
                  onChange={e => setManualPayText(e.target.value)}
                  placeholder="Сумма"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 bg-white"
                />
                <span className="text-gray-500">₽</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between pt-1 font-semibold">
              <span>К выплате</span>
              <span>{formatMoney(finalPreview)}</span>
            </div>
            <p className="text-xs text-gray-400">
              По умолчанию: часы × ставка{surgeriesPreview > 0 ? ` + ${formatMoney(surgeriesPreview)} за операции` : ''}.
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

          {entry ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-danger/30 px-4 py-2.5 font-medium text-danger active:bg-red-50"
            >
              <TrashIcon size={18} /> Удалить запись
            </button>
          ) : null}
        </div>
      </Sheet>

      {confirmingDelete ? (
        <ConfirmDialog
          title="Удалить эту запись?"
          confirmLabel="Удалить"
          onConfirm={() => {
            setConfirmingDelete(false);
            remove();
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      ) : null}
    </>
  );
}

interface StepperFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function StepperField({ label, value, min, max, step, onChange }: StepperFieldProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-gray-500">
        {label}: {value}
      </span>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 px-2 py-1.5">
        <button
          type="button"
          aria-label={`уменьшить ${label}`}
          onClick={() => onChange(Math.max(min, value - step))}
          className="rounded-md px-3 py-1 text-accent"
        >
          −
        </button>
        <span className="tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`увеличить ${label}`}
          onClick={() => onChange(Math.min(max, value + step))}
          className="rounded-md px-3 py-1 text-accent"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-success' : 'bg-gray-300'}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

function timeOn(base: Date, hours: number, minutes: number): Date {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function parseTimeValue(raw: string, fallback: string): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const [hh = 0, mm = 0] = raw.split(':').map(Number) as [number, number];
  d.setHours(hh, mm);
  if (Number.isNaN(hh) || Number.isNaN(mm)) {
    const [fH = 0, fM = 0] = fallback.split(':').map(Number) as [number, number];
    d.setHours(fH, fM);
  }
  return d;
}

function toTimeInputValue(d: Date, fallback: string): string {
  if (Number.isNaN(d.getTime())) return fallback;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function parseTimeInput(d: Date): { hours: number; minutes: number } {
  return { hours: d.getHours(), minutes: d.getMinutes() };
}
