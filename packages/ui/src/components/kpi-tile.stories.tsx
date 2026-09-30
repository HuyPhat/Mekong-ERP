import type { Meta, StoryObj } from '@storybook/react-vite';
import { Banknote, Percent, Wallet } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { KpiTile } from './kpi-tile';

const meta = {
  title: 'Components/KpiTile',
  component: KpiTile,
  tags: ['autodocs'],
  args: {
    label: 'Revenue (this month)',
    value: '1.284.500.000 ₫',
    trend: { direction: 'up', label: '+12,4% vs last month' },
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KpiTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TrendingUp: Story = {};

export const TrendingDown: Story = {
  args: {
    label: 'Cost of goods sold',
    value: '842.100.000 ₫',
    trend: { direction: 'down', label: '−3,1% vs last month' },
    icon: <Wallet className="h-4 w-4 text-muted-foreground" />,
  },
};

export const Flat: Story = {
  args: {
    label: 'Gross margin',
    value: '34,4%',
    trend: { direction: 'flat', label: 'No change' },
    icon: <Percent className="h-4 w-4 text-muted-foreground" />,
  },
};

export const WithoutTrend: Story = {
  args: {
    label: 'Cash position',
    value: '3.905.000.000 ₫',
    icon: <Banknote className="h-4 w-4 text-muted-foreground" />,
  },
};

export const LongValueWraps: Story = {
  args: { label: 'Accounts receivable', value: '12.345.678.901.234.567 ₫' },
};

/** The `Card` building blocks the tile is made from, for content that isn't a single figure. */
export const CardComposition: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Approval rules</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        Purchase orders above 50.000.000 ₫ also need the finance manager.
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline">
          Edit rules
        </Button>
      </CardFooter>
    </Card>
  ),
};
