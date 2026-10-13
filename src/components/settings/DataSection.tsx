import { forwardRef, useRef, useState } from 'react';
import { backupFileName, parseBackup, serializeBackup } from '@/core/backup';
import { importIosFiles } from '@/core/legacy/iosImport';
import { describeMerge, mergeEntries, mergePlannedShifts } from '@/core/merge';
import { appStore } from '@/store/appStoreSingleton';
import type { AppSettings, PlannedShift, WorkEntry } from '@/core/types';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface ImportedData {
  entries: WorkEntry[];
  plannedShifts: PlannedShift[];
  /** Ставку берём из файла только когда пользователь сам этого захотел. */
  settings: AppSettings;
  /** Как применить: добавить к текущим данным (по умолчанию) или заменить всё. */
  mode: 'merge' | 'replace';
  warnings: string[];
}

/** Перенос данных: свой бэкап (экспорт/импорт) и файлы iOS-приложения. */
export function DataSection(): React.JSX.Element {
  const backupInputRef = useRef<HTMLInputElement>(null);
  const iosEntriesRef = useRef<HTMLInputElement>(null);
  const iosShiftsRef = useRef<HTMLInputElement>(null);
  const iosSettingsRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<(ImportedData & { warnings: string[] }) | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const exportBackup = () => {
    const { entries, plannedShifts, settings } = appStore.getState();
    const blob = new Blob([serializeBackup({ entries, plannedShifts, settings })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ kind: 'ok', text: 'Файл резервной копии сохранён.' });
  };

  const clearPickers = () => {
    for (const ref of [backupInputRef, iosEntriesRef, iosShiftsRef, iosSettingsRef]) {
      if (ref.current) ref.current.value = '';
    }
  };

  const onBackupFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setMessage({ kind: 'error', text: parsed.error });
      return;
    }
    setPending({ ...parsed.data, mode: 'merge', warnings: [] });
  };

  const onIosFiles = async (): Promise<void> => {
    const pick = async (ref: React.RefObject<HTMLInputElement | null>): Promise<string | undefined> => {
      const file = ref.current?.files?.[0];
      return file ? file.text() : undefined;
    };
    const files = {
      workEntries: await pick(iosEntriesRef),
      plannedShifts: await pick(iosShiftsRef),
      appSettings: await pick(iosSettingsRef)
    };
    if (!files.workEntries && !files.plannedShifts) {
      setMessage({ kind: 'error', text: 'Выберите хотя бы work_entries.json или planned_shifts.json.' });
      return;
    }
    const result = importIosFiles(files);
    if ('error' in result) {
      setMessage({ kind: 'error', text: result.error });
      return;
    }
    setPending({ ...result, mode: 'merge', warnings: result.warnings });
  };

  const apply = () => {
    if (!pending) return;
    const state = appStore.getState();

    if (pending.mode === 'replace') {
      state.replaceAll({
        entries: pending.entries,
        plannedShifts: pending.plannedShifts,
        settings: pending.settings
      });
      setMessage({
        kind: 'ok',
        text: `Заменено: ${pending.entries.length} записей, ${pending.plannedShifts.length} плановых смен.`
      });
    } else {
      const entries = mergeEntries(state.entries, pending.entries);
      const plannedShifts = mergePlannedShifts(state.plannedShifts, pending.plannedShifts);
      state.replaceAll({
        entries: entries.items,
        plannedShifts: plannedShifts.items,
        settings: state.settings
      });
      const parts = [
        describeMerge('записи', entries),
        describeMerge('плановые смены', plannedShifts)
      ];
      if (pending.settings.hourlyRate !== state.settings.hourlyRate) {
        parts.push(`ставка в файле ${pending.settings.hourlyRate} ₽/ч — не изменена`);
      }
      setMessage({ kind: 'ok', text: `Импорт завершён: ${parts.join('; ')}.` });
    }

    setPending(null);
    clearPickers();
  };

  const summaryOfPending = (pending: ImportedData): string =>
    pending.mode === 'replace'
      ? 'Текущие записи и плановые смены будут удалены и заменены содержимым файла. Это действие необратимо.'
      : `Данные из файла будут добавлены к текущим (${pending.entries.length} записей, ${
          pending.plannedShifts.length
        } плановых смен). Совпадающие по id записи будут обновлены версией из файла. Ставка в настройках не изменится.`;

  return (
    <section className="rounded-card bg-white p-4 shadow-sm">
      <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400">Данные</h2>
      <p className="mt-2 text-sm text-gray-500">
        Данные хранятся только в этом браузере, без аккаунта и сервера. В обычном окне Safari на iPhone Safari
        может очистить их после длительного отсутствия — держите резервную копию.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={exportBackup}
          className="rounded-xl bg-gray-100 px-4 py-2.5 font-medium text-gray-800 active:bg-gray-200"
        >
          Скачать резервную копию
        </button>

        <button
          type="button"
          onClick={() => backupInputRef.current?.click()}
          className="rounded-xl border border-gray-200 px-4 py-2.5 font-medium text-accent active:bg-gray-50"
        >
          Импортировать из файла
        </button>
        <input
          ref={backupInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={e => void onBackupFile(e.target.files?.[0])}
        />

        <details className="mt-2 rounded-xl bg-gray-50 p-3">
          <summary className="cursor-pointer text-sm font-medium">Перенести из iOS-приложения</summary>
          <p className="mt-2 text-xs text-gray-500">
            Файлы work_entries.json, planned_shifts.json и app_settings.json из папки приложения — в приложении
            «Файлы» на iPhone (папка «Учёт смен») либо в Finder на Mac.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <FilePicker ref={iosEntriesRef} label="work_entries.json" />
            <FilePicker ref={iosShiftsRef} label="planned_shifts.json" />
            <FilePicker ref={iosSettingsRef} label="app_settings.json" />
            <button
              type="button"
              onClick={() => void onIosFiles()}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-accent active:bg-gray-100"
            >
              Импортировать выбранные файлы
            </button>
          </div>
        </details>
      </div>

      {message ? (
        <p className={`mt-3 text-sm ${message.kind === 'ok' ? 'text-success' : 'text-danger'}`}>{message.text}</p>
      ) : null}

      {pending ? (
        <ConfirmDialog
          title="Импорт данных"
          message={pending.warnings.length > 0 ? `${summaryOfPending(pending)} Предупреждения: ${pending.warnings.join(' ')}` : summaryOfPending(pending)}
          confirmLabel={pending.mode === 'replace' ? 'Заменить' : 'Добавить'}
          cancelLabel="Отмена"
          destructive={pending.mode === 'replace'}
          onConfirm={apply}
          onCancel={() => setPending(null)}
        >
          <div className="flex overflow-hidden rounded-xl border border-gray-200">
            {(
              [
                { value: 'merge', label: 'Добавить к текущим' },
                { value: 'replace', label: 'Заменить всё' }
              ] as const
            ).map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPending(p => (p ? { ...p, mode: option.value } : p))}
                className={`flex-1 py-2.5 text-sm font-medium ${
                  pending.mode === option.value ? 'bg-accent text-white' : 'bg-white text-gray-600 active:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}

const FilePicker = forwardRef<HTMLInputElement, { label: string }>(function FilePicker({ label }, ref) {
  const [name, setName] = useState<string | null>(null);
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
      <span className={name ? 'truncate text-gray-800' : 'truncate text-gray-400'}>{name ?? label}</span>
      <span className="shrink-0 text-accent">Выбрать…</span>
      <input
        ref={ref}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={e => setName(e.target.files?.[0]?.name ?? null)}
      />
    </label>
  );
});
