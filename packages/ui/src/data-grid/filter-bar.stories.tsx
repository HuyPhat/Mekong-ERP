import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FilterBar, type ColumnFilterConfig, type FilterValues } from './filters';

const CONFIGS: ColumnFilterConfig[] = [
  {
    id: 'category',
    label: 'Category',
    type: 'enum-multiselect',
    options: [
      { label: 'Đồ uống', value: 'drinks' },
      { label: 'Bánh kẹo', value: 'sweets' },
      { label: 'Gia vị', value: 'spices' },
    ],
  },
  { id: 'price', label: 'Sale price', type: 'number-range' },
  { id: 'created', label: 'Created', type: 'date-range' },
];

/** Keeps the values in state, the way the routes keep them in the URL. */
function ControlledFilterBar({ initial = {} }: { initial?: FilterValues }) {
  const [values, setValues] = useState<FilterValues>(initial);
  return (
    <div className="w-[860px]">
      <FilterBar configs={CONFIGS} values={values} onChange={setValues} />
      <pre className="mt-3 rounded-md bg-muted p-3 text-xs" aria-label="Current filter values">
        {JSON.stringify(values, null, 2)}
      </pre>
    </div>
  );
}

const meta = {
  title: 'Data/FilterBar',
  component: ControlledFilterBar,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ControlledFilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoFilters: Story = {};

export const WithActiveFilters: Story = {
  args: { initial: { category: 'drinks,sweets', priceMin: '20000', createdFrom: '2026-01-01' } },
};
