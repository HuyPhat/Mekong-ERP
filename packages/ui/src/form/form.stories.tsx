import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { useForm } from 'react-hook-form';
import { Button } from '../components/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form';
import { Input } from './input';
import { Textarea } from './textarea';

interface SupplierFormValues {
  supplier: string;
  creditLimit: string;
  notes: string;
}

/**
 * FormKit wires React Hook Form to labelled fields: the label, description and
 * error message are tied to the control by id, so screen readers announce them
 * together (`aria-describedby`, `aria-invalid`).
 */
function SupplierForm() {
  const form = useForm<SupplierFormValues>({
    defaultValues: { supplier: '', creditLimit: '', notes: '' },
    mode: 'onTouched',
  });

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(() => undefined)(event);
        }}
        className="flex w-96 flex-col gap-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="supplier"
          rules={{ required: 'Enter the supplier name.' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier</FormLabel>
              <FormControl>
                <Input placeholder="Công ty TNHH Bao Bì An Giang" {...field} />
              </FormControl>
              <FormDescription>The registered company name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="creditLimit"
          rules={{
            required: 'Enter a credit limit.',
            pattern: { value: /^\d+$/, message: 'Use whole VND, digits only.' },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credit limit (VND)</FormLabel>
              <FormControl>
                <Input inputMode="numeric" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit">Save supplier</Button>
      </form>
    </Form>
  );
}

const meta = {
  title: 'Form/FormKit',
  component: SupplierForm,
  tags: ['autodocs'],
} satisfies Meta<typeof SupplierForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

/** Submitting the empty form shows every message and marks the fields invalid. */
export const WithValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Save supplier' }));
  },
};
