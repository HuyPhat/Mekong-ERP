import { z } from 'zod';
import { gqlRequest } from './graphql-client';

const RevenuePointSchema = z.object({
  month: z.string(),
  revenue: z.number().int(),
  cogs: z.number().int(),
  grossMargin: z.number().int(),
});

const AgingBucketSchema = z.enum(['current', '1-30', '31-60', '61-90', '90+']);
const AgingSummaryPointSchema = z.object({
  bucket: AgingBucketSchema,
  total: z.number().int(),
  count: z.number().int(),
});

export const DashboardDataSchema = z.object({
  revenueTrend: z.array(RevenuePointSchema),
  cashPosition: z.number().int(),
  arTotal: z.number().int(),
  apTotal: z.number().int(),
  arAgingSummary: z.array(AgingSummaryPointSchema),
  apAgingSummary: z.array(AgingSummaryPointSchema),
  lowStockCount: z.number().int(),
  openSalesOrders: z.number().int(),
  openPurchaseOrders: z.number().int(),
  pendingApprovals: z.number().int(),
});
export type DashboardData = z.infer<typeof DashboardDataSchema>;

// Kept to one bounded query (PLAN.md §9 risk 4) — GraphQL is only ever used
// for this dashboard-aggregates read, never for CRUD.
const DASHBOARD_QUERY = `
  query DashboardAggregates {
    revenueTrend { month revenue cogs grossMargin }
    cashPosition
    arTotal
    apTotal
    arAgingSummary { bucket total count }
    apAgingSummary { bucket total count }
    lowStockCount
    openSalesOrders
    openPurchaseOrders
    pendingApprovals
  }
`;

export async function fetchDashboardData(): Promise<DashboardData> {
  const data = await gqlRequest<unknown>(DASHBOARD_QUERY);
  return DashboardDataSchema.parse(data);
}
