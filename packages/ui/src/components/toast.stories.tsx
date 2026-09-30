import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { toast } from './toast-store';
import { Toaster } from './toaster';

const meta = {
  title: 'Components/Toast',
  component: Toaster,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    // Mount the Toaster once; anything can then call `toast()`.
    (Story) => (
      <>
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Notifications: Story = {
  render: () => (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            toast({
              title: 'Approval requested',
              description: 'PO-2026-000123 is waiting for your decision.',
            })
          }
        >
          Show a notification
        </Button>
        <Button
          variant="destructive"
          onClick={() =>
            toast({
              title: 'Something went wrong',
              description: 'The purchase order could not be saved.',
              variant: 'destructive',
            })
          }
        >
          Show an error
        </Button>
      </div>
      <Toaster />
    </>
  ),
};
