import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';
import { LineItemsTable, type LineItemsColumn } from './line-items-table';

interface Line {
  id: string;
  product: string;
  quantity: number;
  unitPrice: number;
}

const COLUMNS: LineItemsColumn[] = [
  { key: 'product', header: 'Product', className: 'w-1/2' },
  { key: 'quantity', header: 'Qty', align: 'right' },
  { key: 'unitPrice', header: 'Unit price (VND)', align: 'right' },
  { key: 'total', header: 'Line total', align: 'right' },
];

const VND = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

let nextId = 3;

function EditableLines({ initial }: { initial: Line[] }) {
  const [lines, setLines] = useState<Line[]>(initial);

  function update(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  return (
    <div className="w-[720px]">
      <LineItemsTable
        columns={COLUMNS}
        rows={lines}
        onAddRow={() => {
          nextId += 1;
          setLines((current) => [
            ...current,
            { id: String(nextId), product: '', quantity: 1, unitPrice: 0 },
          ]);
        }}
        onRemoveRow={(index) => setLines((current) => current.filter((_, i) => i !== index))}
        renderCell={(row, index, key) => {
          if (key === 'total') return VND.format(row.quantity * row.unitPrice);
          if (key === 'product') {
            return (
              <Input
                aria-label="Product"
                value={row.product}
                onChange={(event) => update(index, { product: event.target.value })}
              />
            );
          }
          if (key === 'quantity') {
            return (
              <Input
                aria-label="Quantity"
                type="number"
                className="text-right"
                value={row.quantity}
                onChange={(event) => update(index, { quantity: Number(event.target.value) })}
              />
            );
          }
          return (
            <Input
              aria-label="Unit price"
              type="number"
              className="text-right"
              value={row.unitPrice}
              onChange={(event) => update(index, { unitPrice: Number(event.target.value) })}
            />
          );
        }}
        footer={
          <tr>
            <td colSpan={3} className="px-3 py-2 text-right text-sm font-medium">
              Subtotal
            </td>
            <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums">
              {VND.format(subtotal)}
            </td>
            <td />
          </tr>
        }
      />
    </div>
  );
}

const meta = {
  title: 'Form/LineItemsTable',
  component: EditableLines,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof EditableLines>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithLines: Story = {
  args: {
    initial: [
      { id: '1', product: 'Nước mắm Phú Quốc 500ml', quantity: 24, unitPrice: 48000 },
      { id: '2', product: 'Mì gói Hảo Hảo (thùng 30)', quantity: 10, unitPrice: 115000 },
    ],
  },
};

export const Empty: Story = { args: { initial: [] } };
