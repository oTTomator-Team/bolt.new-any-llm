interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export function TimeRangeSelector({ value, onChange, options }: TimeRangeSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 text-sm border border-bolt-elements-borderColor/20 rounded-md bg-bolt-elements-background-depth-4 text-bolt-elements-textPrimary hover:border-bolt-elements-borderColor/40 focus:border-bolt-elements-borderColor/60 transition-colors"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
