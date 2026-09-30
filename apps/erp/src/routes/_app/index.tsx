import type { ReactNode } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { KpiTile, Card, CardHeader, CardTitle, CardContent } from '@mekong-erp/ui';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../shared/permissions/guards';
import { useSession } from '../../features/auth/queries';
import { useDashboardData } from '../../features/dashboard/queries';
import { formatVnd } from '../../shared/lib/format';
import { formatVndCompact } from '../../shared/lib/compact-vnd';

export const Route = createFileRoute('/_app/')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.dashboardRead),
  component: DashboardPage,
});

const tooltipContentStyle = {
  background: 'var(--background)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
};

function DashboardPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { data, isLoading } = useDashboardData();

  const lastMonth = data?.revenueTrend.at(-1);
  const grossMarginPct =
    lastMonth && lastMonth.revenue > 0
      ? Math.round((lastMonth.grossMargin / lastMonth.revenue) * 100)
      : 0;

  function bucketLabel(bucket: ReactNode) {
    return t(`accounting.aging.buckets.${String(bucket)}`);
  }

  function moneyTooltip(value: unknown) {
    return formatVnd(Number(value));
  }

  return (
    <div className="flex flex-col gap-6">
      {session?.user && (
        <div>
          <h1 className="text-xl font-semibold">
            {t('dashboard.welcome', { name: session.user.name })}
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.roleLabel', { role: t(`roles.${session.user.role}`) })}
          </p>
        </div>
      )}

      {isLoading || !data ? (
        <p className="text-muted-foreground">{t('dashboard.loading')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiTile
              label={t('dashboard.kpis.revenue')}
              value={formatVnd(lastMonth?.revenue ?? 0)}
            />
            <KpiTile label={t('dashboard.kpis.grossMargin')} value={`${grossMarginPct}%`} />
            <KpiTile
              label={t('dashboard.kpis.cashPosition')}
              value={formatVnd(data.cashPosition)}
            />
            <KpiTile label={t('dashboard.kpis.arTotal')} value={formatVnd(data.arTotal)} />
            <KpiTile label={t('dashboard.kpis.apTotal')} value={formatVnd(data.apTotal)} />
            <KpiTile
              label={t('dashboard.kpis.pendingApprovals')}
              value={String(data.pendingApprovals)}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.charts.revenueTrend')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.revenueTrend}
                    margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickFormatter={formatVndCompact}
                      width={56}
                    />
                    <Tooltip formatter={moneyTooltip} contentStyle={tooltipContentStyle} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name={t('dashboard.charts.revenue')}
                      stroke="var(--accent)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="cogs"
                      name={t('dashboard.charts.cogs')}
                      stroke="var(--muted-foreground)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.charts.arAging')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.arAgingSummary}
                      margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="bucket"
                        tickFormatter={bucketLabel}
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickFormatter={formatVndCompact}
                        width={56}
                      />
                      <Tooltip
                        formatter={moneyTooltip}
                        labelFormatter={bucketLabel}
                        contentStyle={tooltipContentStyle}
                      />
                      <Bar
                        dataKey="total"
                        name={t('dashboard.charts.outstanding')}
                        fill="var(--accent)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Link
                  to="/accounting/ar-aging"
                  className="mt-2 inline-block text-sm text-accent hover:underline"
                >
                  {t('dashboard.charts.viewFullReport')}
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.charts.apAging')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.apAgingSummary}
                      margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="bucket"
                        tickFormatter={bucketLabel}
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickFormatter={formatVndCompact}
                        width={56}
                      />
                      <Tooltip
                        formatter={moneyTooltip}
                        labelFormatter={bucketLabel}
                        contentStyle={tooltipContentStyle}
                      />
                      <Bar
                        dataKey="total"
                        name={t('dashboard.charts.outstanding')}
                        fill="var(--warning)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Link
                  to="/accounting/ap-aging"
                  className="mt-2 inline-block text-sm text-accent hover:underline"
                >
                  {t('dashboard.charts.viewFullReport')}
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
