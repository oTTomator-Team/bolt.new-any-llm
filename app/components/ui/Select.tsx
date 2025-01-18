import * as SelectPrimitive from '@radix-ui/react-select';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}

export function Select({ value, onValueChange, options, className = '' }: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={`
          flex items-center justify-between w-full px-3 py-2 text-sm
          bg-bolt-elements-background-depth-2 
          border border-bolt-elements-borderColor
          rounded-md text-bolt-elements-text-color
          hover:bg-bolt-elements-background-depth-3
          focus:outline-none focus:ring-2 focus:ring-bolt-elements-borderColor
          ${className}
        `}
      >
        <SelectPrimitive.Value>{options.find((option) => option.value === value)?.label}</SelectPrimitive.Value>
        <SelectPrimitive.Icon>
          <div className="i-ph:caret-down" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="
            z-50 min-w-[8rem] overflow-hidden rounded-md border border-bolt-elements-borderColor
            bg-bolt-elements-background-depth-2 text-bolt-elements-text-color shadow-md
          "
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="
                  relative flex items-center px-6 py-2 text-sm
                  cursor-pointer select-none
                  data-[highlighted]:bg-bolt-elements-background-depth-3
                  data-[highlighted]:text-bolt-elements-text-color
                  outline-none
                "
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute left-2">
                  <div className="i-ph:check text-bolt-elements-text-color" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
