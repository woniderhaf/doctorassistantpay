import { useState } from 'react';
import { parseNumber } from '@/core/parseNumber';
import { appStore } from '@/store/appStoreSingleton';

/** Порт SettingsView (без секций уведомлений — web v1): ставка + правила округления + данные. */
export function SettingsPage(): React.JSX.Element {
  const settings = appStore(s => s.settings);
  const setHourlyRate = appStore(s => s.setHourlyRate);

  const [rateText, setRateText] = useState(() => formatRate(settings.hourlyRate));

  // как saveRate() в iOS: принимаем только положительное число, иначе молча оставляем старое
  const saveRate = () => {
    const value = parseNumber(rateText);
    if (value != null && value > 0) {
      setHourlyRate(value);
      setRateText(formatRate(value));
    } else {
      setRateText(formatRate(settings.hourlyRate));
    }
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-8 pt-4">
      <h1 className="text-2xl font-bold">Настройки</h1>

      <section className="rounded-card bg-white p-4 shadow-sm">
        <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400">Ставка по умолчанию</h2>
        <div className="mt-2 flex items-center gap-2">
          <input
            inputMode="decimal"
            value={rateText}
            onChange={e => setRateText(e.target.value)}
            onBlur={saveRate}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            placeholder="Ставка в час"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5"
          />
          <span className="text-gray-500">₽/ч</span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Эта ставка подставляется при создании новой записи. Для уже сохранённых смен ставка не меняется —
          её можно поправить отдельно при редактировании записи.
        </p>
      </section>

      <section className="rounded-card bg-white p-4 shadow-sm">
        <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400">Как считаются часы</h2>
        <p className="mt-2 text-sm text-gray-500">
          Отработанное время округляется до ближайшего получаса: например, 6 ч 40 мин → 6,5 ч, а 6 ч 50 мин → 7 ч.
        </p>
      </section>

      <section className="rounded-card bg-white p-4 shadow-sm">
        <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400">Данные</h2>
        <p className="mt-2 text-sm text-gray-500">
          Данные хранятся только в этом браузере, без аккаунта и сервера. На iPhone в обычном окне Safari
          Safari может очистить их после длительного отсутствия — держите резервную копию.
        </p>
      </section>
    </div>
  );
}

/** Как Self.format(rate:) в iOS: целые без дробной части. */
function formatRate(rate: number): string {
  return Number.isInteger(rate) ? String(rate) : String(rate);
}
