import { formatMoney } from '@/format/intl';
import type { Surgery } from '@/core/types';
import { PlusIcon, TrashIcon } from '../ui/icons';

interface SurgeriesEditorProps {
  surgeries: Surgery[];
  defaultPrice: number;
  onChange: (surgeries: Surgery[]) => void;
}

/** Список операций смены: название + цена, добавление по цене из настроек, удаление. */
export function SurgeriesEditor({ surgeries, defaultPrice, onChange }: SurgeriesEditorProps): React.JSX.Element {
  const total = surgeries.reduce((sum, s) => sum + s.price, 0);

  const update = (index: number, patch: Partial<Surgery>) =>
    onChange(surgeries.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">Операции</span>
        {surgeries.length > 0 ? <span className="text-sm font-semibold">{formatMoney(total)}</span> : null}
      </div>

      {surgeries.map((surgery, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={surgery.name}
            onChange={e => update(i, { name: e.target.value })}
            placeholder="Название операции"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5"
          />
          <input
            inputMode="decimal"
            value={priceInputValue(surgery.price)}
            onChange={e => update(i, { price: parsePrice(e.target.value) })}
            placeholder="Цена"
            className="w-24 rounded-lg border border-gray-200 px-3 py-2.5 text-right"
          />
          <button
            type="button"
            aria-label="Удалить операцию"
            onClick={() => onChange(surgeries.filter((_, j) => j !== i))}
            className="rounded-lg p-2 text-danger active:bg-red-50"
          >
            <TrashIcon size={18} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...surgeries, { name: '', price: defaultPrice }])}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-accent active:bg-gray-50"
      >
        <PlusIcon size={16} /> Добавить операцию
      </button>
    </div>
  );
}

/** Цена в инпуте: целые без дробной части. */
function priceInputValue(price: number): string {
  return Number.isInteger(price) ? String(price) : String(price);
}

/** Пустое/мусор → 0 (операция без цены всё равно видна строкой и будет удалена/исправлена). */
function parsePrice(raw: string): number {
  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
