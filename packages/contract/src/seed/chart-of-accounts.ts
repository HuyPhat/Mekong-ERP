import type { ChartOfAccount } from '../accounting-entities';

// VAS-style codes named in PLAN.md §7 — illustrative and fully editable, not
// asserted against a specific current circular number (PLAN.md §9 risk 6).
const ACCOUNTS: ChartOfAccount[] = [
  { id: 'coa-111', code: '111', name: 'Tiền mặt', type: 'asset', normalBalance: 'debit' },
  {
    id: 'coa-112',
    code: '112',
    name: 'Tiền gửi ngân hàng',
    type: 'asset',
    normalBalance: 'debit',
  },
  {
    id: 'coa-131',
    code: '131',
    name: 'Phải thu khách hàng',
    type: 'asset',
    normalBalance: 'debit',
  },
  {
    id: 'coa-1331',
    code: '1331',
    name: 'Thuế GTGT được khấu trừ',
    type: 'asset',
    normalBalance: 'debit',
  },
  { id: 'coa-156', code: '156', name: 'Hàng hóa', type: 'asset', normalBalance: 'debit' },
  {
    id: 'coa-331',
    code: '331',
    name: 'Phải trả người bán',
    type: 'liability',
    normalBalance: 'credit',
  },
  {
    id: 'coa-3331',
    code: '3331',
    name: 'Thuế GTGT đầu ra',
    type: 'liability',
    normalBalance: 'credit',
  },
  {
    id: 'coa-511',
    code: '511',
    name: 'Doanh thu bán hàng',
    type: 'revenue',
    normalBalance: 'credit',
  },
  {
    id: 'coa-632',
    code: '632',
    name: 'Giá vốn hàng bán',
    type: 'expense',
    normalBalance: 'debit',
  },
  {
    id: 'coa-641',
    code: '641',
    name: 'Chi phí bán hàng',
    type: 'expense',
    normalBalance: 'debit',
  },
  {
    id: 'coa-642',
    code: '642',
    name: 'Chi phí quản lý doanh nghiệp',
    type: 'expense',
    normalBalance: 'debit',
  },
];

export function generateChartOfAccounts(): ChartOfAccount[] {
  return ACCOUNTS;
}
