import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './button';

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Save changes' },
  argTypes: {
    variant: { control: 'select', options: ['default', 'outline', 'ghost', 'destructive'] },
    size: { control: 'inline-radio', options: ['default', 'sm', 'icon'] },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Outline: Story = { args: { variant: 'outline' } };

export const Ghost: Story = { args: { variant: 'ghost' } };

export const Destructive: Story = { args: { variant: 'destructive', children: 'Reject' } };

export const Small: Story = { args: { size: 'sm' } };

export const Disabled: Story = { args: { disabled: true } };

export const WithIcon: Story = {
  render: (args) => (
    <Button {...args}>
      <Plus className="h-4 w-4" />
      New purchase order
    </Button>
  ),
};

export const IconOnly: Story = {
  args: { variant: 'ghost', size: 'icon', 'aria-label': 'Delete line' },
  render: (args) => (
    <Button {...args}>
      <Trash2 className="h-4 w-4" />
    </Button>
  ),
};

export const AsChildLink: Story = {
  args: { asChild: true, variant: 'outline' },
  render: (args) => (
    <Button {...args}>
      <a href="#purchase-orders">Open as a link</a>
    </Button>
  ),
};
