import type { Meta, StoryObj } from '@storybook/react-vite';
import { Timeline, type TimelineEntry } from './timeline';

const approvalChain: TimelineEntry[] = [
  {
    id: '1',
    title: 'Created',
    timestampLabel: '12/03/2026 09:14',
    description: 'Nguyễn Văn An created the draft.',
  },
  {
    id: '2',
    title: 'Submitted for approval',
    timestampLabel: '12/03/2026 09:20',
    tone: 'info',
  },
  {
    id: '3',
    title: 'Approved by Purchasing Manager',
    timestampLabel: '12/03/2026 11:02',
    description: 'Within budget.',
    tone: 'success',
  },
  {
    id: '4',
    title: 'Waiting for Finance Manager',
    timestampLabel: '12/03/2026 11:02',
    tone: 'warning',
  },
];

const meta = {
  title: 'Components/Timeline',
  component: Timeline,
  tags: ['autodocs'],
  args: { items: approvalChain },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The document "chatter": who did what, oldest first. */
export const ApprovalChain: Story = {};

export const RejectedWithReason: Story = {
  args: {
    items: [
      ...approvalChain.slice(0, 3),
      {
        id: '4',
        title: 'Rejected by Finance Manager',
        timestampLabel: '12/03/2026 14:30',
        description: 'Supplier is over its credit limit.',
        tone: 'destructive',
      },
    ],
  },
};

export const SingleEntry: Story = { args: { items: approvalChain.slice(0, 1) } };
