import { forwardRef, useMemo, useState, type ComponentPropsWithoutRef } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  cn,
} from '@mekong-erp/ui';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

export interface ComboboxFieldProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'onSelect' | 'value'
> {
  value: string | undefined;
  onSelect: (value: string) => void;
  selectedLabel?: string | undefined;
  options: ComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
}

const MAX_VISIBLE_OPTIONS = 50;

// A searchable picker built on the existing Command/Dialog primitives (the
// same pieces behind the command palette) rather than a new Radix Select —
// filtering is client-side, which is fine at this app's seeded data sizes
// (hundreds of suppliers, a few thousand products), not a real-scale combobox.
export const ComboboxField = forwardRef<HTMLButtonElement, ComboboxFieldProps>(
  (
    {
      value,
      onSelect,
      selectedLabel,
      options,
      placeholder,
      searchPlaceholder,
      emptyMessage,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
      if (!search) return options;
      const needle = search.toLowerCase();
      return options.filter((option) => option.label.toLowerCase().includes(needle));
    }, [options, search]);

    function handleOpenChange(next: boolean) {
      setOpen(next);
      if (!next) setSearch('');
    }

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <Button
          ref={ref}
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => handleOpenChange(true)}
          className="w-full justify-between font-normal"
          {...rest}
        >
          <span className={cn('truncate', !selectedLabel && 'text-muted-foreground')}>
            {selectedLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
        <DialogContent className="max-w-md overflow-hidden p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={searchPlaceholder}
            />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {filtered.slice(0, MAX_VISIBLE_OPTIONS).map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      onSelect(option.value);
                      handleOpenChange(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.description !== undefined && (
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    );
  },
);
ComboboxField.displayName = 'ComboboxField';
