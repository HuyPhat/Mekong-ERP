import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText, Languages, Package } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';

const meta = {
  title: 'Components/Command',
  component: Command,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-96 rounded-lg border border-border shadow-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The list behind the command palette and every searchable picker. */
export const Palette: Story = {
  render: () => (
    <Command>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem>
            <Package className="h-4 w-4" />
            Inventory
          </CommandItem>
          <CommandItem>
            <FileText className="h-4 w-4" />
            Purchase orders
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Settings">
          <CommandItem>
            <Languages className="h-4 w-4" />
            Switch language
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
