import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { Select } from './select';
import { Textarea } from './textarea';

const meta = {
  title: 'Form/Fields',
  component: Input,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextInput: Story = {
  args: { 'aria-label': 'Product name', placeholder: 'Nước mắm Phú Quốc 500ml' },
};

export const Invalid: Story = {
  args: { 'aria-label': 'Quantity', defaultValue: '-3', 'aria-invalid': true },
};

export const Disabled: Story = {
  args: { 'aria-label': 'Document number', defaultValue: 'PO-2026-000123', disabled: true },
};

export const Number: Story = {
  args: { 'aria-label': 'Unit price', type: 'number', defaultValue: 125000 },
};

export const SelectField: Story = {
  render: () => (
    <Select aria-label="Warehouse" defaultValue="hcm-01">
      <option value="hcm-01">HCM-01 Thủ Đức</option>
      <option value="hcm-02">HCM-02 Bình Tân</option>
    </Select>
  ),
};

export const TextareaField: Story = {
  render: () => <Textarea aria-label="Delivery notes" placeholder="Gate 3, call before arrival" />,
};

export const CheckboxField: Story = {
  render: () => (
    <div className="flex items-center gap-2 text-sm">
      <Checkbox id="copy-supplier" defaultChecked />
      <label htmlFor="copy-supplier">Send a copy to the supplier</label>
    </div>
  ),
};
