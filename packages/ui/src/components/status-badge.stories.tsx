import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusBadge } from './status-badge';

const meta = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  args: { children: 'Approved', tone: 'success' },
  argTypes: {
    tone: { control: 'select', options: ['neutral', 'info', 'warning', 'success', 'destructive'] },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {};

export const Warning: Story = { args: { children: 'Pending approval', tone: 'warning' } };

export const Destructive: Story = { args: { children: 'Rejected', tone: 'destructive' } };

export const Info: Story = { args: { children: 'Partially received', tone: 'info' } };

export const Neutral: Story = { args: { children: 'Draft', tone: 'neutral' } };

/** How a document's lifecycle maps onto tones across the app. */
export const PurchaseOrderLifecycle: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge tone="neutral">Draft</StatusBadge>
      <StatusBadge tone="warning">Pending approval</StatusBadge>
      <StatusBadge tone="info">Approved</StatusBadge>
      <StatusBadge tone="info">Partially received</StatusBadge>
      <StatusBadge tone="success">Received</StatusBadge>
      <StatusBadge tone="success">Closed</StatusBadge>
      <StatusBadge tone="destructive">Rejected</StatusBadge>
      <StatusBadge tone="destructive">Cancelled</StatusBadge>
    </div>
  ),
};
