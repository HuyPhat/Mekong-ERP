import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog';

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function RejectDialogBody() {
  return (
    <DialogContent>
      {/* Every dialog needs a title: without one it has no accessible name (axe: aria-dialog-name). */}
      <DialogTitle>Reject purchase order</DialogTitle>
      <DialogDescription>
        The requester is told why. A reason is required and appears on the document timeline.
      </DialogDescription>
      <div className="mt-4 flex justify-end gap-2">
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button variant="destructive">Reject</Button>
      </div>
    </DialogContent>
  );
}

export const WithTrigger: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Reject…</Button>
      </DialogTrigger>
      <RejectDialogBody />
    </Dialog>
  ),
};

export const OpenOnLoad: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <Dialog defaultOpen>
      <RejectDialogBody />
    </Dialog>
  ),
};
