interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>): React.JSX.Element {
  return (
    <div className="flex rounded-xl bg-gray-200/70 p-1" role="tablist">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            value === opt.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
